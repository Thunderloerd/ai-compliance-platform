"""One-off script: create a minimal PDF named 'Demo Policy.pdf' for upload."""
import sys
from pathlib import Path

# backend/scripts -> backend
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

OUTPUT_DIR = backend_root.parent / "assets"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_PATH = OUTPUT_DIR / "Demo Policy.pdf"

def main():
    width, height = letter
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=letter)
    y = height - inch

    c.setFont("Helvetica-Bold", 16)
    c.drawString(inch, y, "Demo Policy")
    y -= 0.5 * inch

    c.setFont("Helvetica", 11)
    lines = [
        "This is a sample compliance policy for demonstration.",
        "",
        "1. Data retention: Personal data shall be retained for no longer than 7 years unless required by law.",
        "",
        "2. Training: All employees must complete security and compliance training within 30 days of joining.",
        "",
        "3. Third-party processors: Third-party processors must sign Data Processing Agreements (DPAs) before any data transfer.",
        "",
        "4. Security: All personal data must be protected with appropriate technical and organizational measures.",
    ]
    for line in lines:
        c.drawString(inch, y, line[:90])
        y -= 0.25 * inch

    c.save()
    print(f"Created: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
