import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import json
from groq import Groq
from app.config import settings
from app.services.pdf_service import extract_text_from_pdf
from app.services.rule_extractor import _parse_json_safely

text = extract_text_from_pdf("sample-policy.pdf")
client = Groq(api_key=settings.GROQ_API_KEY)

system_prompt = (
    "You are a compliance rule extractor. Your output must be strictly valid JSON only: "
    "a single JSON array of rule objects. Do not include any explanation, markdown, or text outside the JSON.\n\n"
    "Each rule object must have these fields:\n"
    "- \"entity\" (string): table/entity name, e.g. \"employees\"\n"
    "- \"field\" (string): column name, e.g. \"training_completed\"\n"
    "- \"condition\" (object or string): structured condition when applicable\n"
    "- \"operator\" (string): \"=\", \"!=\", \"<\", \">\", \"<=\", \">=\"\n"
    "- \"value\" (string, number, or boolean): expected value\n"
    "- \"severity\" (string): e.g. \"low\", \"medium\", \"high\"\n"
    "- \"policy_clause_text\" (string, optional): exact or paraphrased policy clause"
)

user_prompt = (
    f"Extract compliance rules from the following policy text. Return only a JSON array of rule objects.\n\n"
    f"Policy text:\n\n{text}"
)

for model in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]:
    print("=" * 60)
    print("Testing rule extraction with:", model)
    try:
        kwargs = {"max_tokens": 2048, "temperature": 0.1}
        if "gpt-oss" in model:
            kwargs["extra_body"] = {"reasoning_format": "hidden", "reasoning_effort": "low"}
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            **kwargs,
        )
        content = resp.choices[0].message.content or ""
        print("Raw content (first 200 chars):", repr(content[:200]))
        parsed = _parse_json_safely(content)
        print("SUCCESS! Parsed rules count:", len(parsed))
        print("First rule:", json.dumps(parsed[0]))
    except Exception as e:
        print("ERROR with", model, ":", e)
