import os, sys, time, requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
EMAIL = "admin@company.com"
PASSWORD = "Admin@123"

session = requests.Session()
login_res = session.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
if login_res.status_code != 200:
    print(f"Login failed: {login_res.status_code} {login_res.text}")
    sys.exit(1)

token = login_res.json().get("token")
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in as {EMAIL}")

backend_root = Path(__file__).resolve().parent.parent.parent
pdfs = ["sample-policy.pdf", "sample-hr-policy.pdf"]

for pdf_name in pdfs:
    pdf_path = backend_root / pdf_name
    print(f"\nUploading {pdf_name}...")
    with open(pdf_path, "rb") as f:
        resp = session.post(
            f"{BASE_URL}/policy/upload",
            files={"file": (pdf_name, f, "application/pdf")},
            headers=headers,
            timeout=120,
        )
    print(f"Status: {resp.status_code}")
    try:
        data = resp.json()
        print(f"Response: {len(data)} items returned.")
        if data:
            print("Item 0:", data[0])
            print("Total rules extracted:", len([d for d in data if d.get("id", 0) > 0]))
            print("Rules status:", data[0].get("rules_status"))
    except Exception as e:
        print("Raw response text:", resp.text[:300])

print("\nVerifying policies in DB and Chroma...")
time.sleep(2)
sys.path.insert(0, str(backend_root))
from app.database import engine
from sqlalchemy import text
import chromadb
from app.services.rag_service import _chroma_path, COLLECTION_NAME

with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, name, version, is_active FROM policies")).fetchall()
    print("Policies in PostgreSQL:")
    for r in rows:
        rules_count = conn.execute(text(f"SELECT COUNT(*) FROM rules WHERE policy_id = {r[0]}")).scalar()
        print(f"  Policy {r[0]}: {r[1]} v{r[2]} (active={r[3]}) - {rules_count} rules")

client = chromadb.PersistentClient(path=_chroma_path())
coll = client.get_collection(COLLECTION_NAME)
all_docs = coll.get(include=["metadatas"])
print(f"\nChroma total chunks: {coll.count()}")
policy_counts = {}
for m in all_docs["metadatas"]:
    pname = m.get("policy_name", "unknown")
    policy_counts[pname] = policy_counts.get(pname, 0) + 1

for pname, count in policy_counts.items():
    print(f"  Policy '{pname}': {count} chunk(s)")
