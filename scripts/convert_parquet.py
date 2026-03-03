"""Convert big_output.parquet → pairData.json + cardNames.json"""
import json
import os
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARQUET = os.path.join(ROOT, "big_output.parquet")
OUT_DIR = os.path.join(ROOT, "src", "data")

os.makedirs(OUT_DIR, exist_ok=True)

df = pd.read_parquet(PARQUET)
print(f"Loaded {len(df):,} rows from parquet")

# Build pair data with alphabetically-sorted keys
pair_data = {}
card_names = set()

for _, row in df.iterrows():
    a, b = sorted([row["left_name"], row["right_name"]])
    key = f"{a}|||{b}"
    pair_data[key] = {
        "w": round(row["Winrate"], 4),
        "c": int(row["ConfidentChallenges"]),
        "l": round(row["LogMultiplier"], 4),
        "p": round(row["PowerRank"], 4),
    }
    card_names.add(row["left_name"])
    card_names.add(row["right_name"])

# Write pair data
pair_path = os.path.join(OUT_DIR, "pairData.json")
with open(pair_path, "w") as f:
    json.dump(pair_data, f, separators=(",", ":"))
print(f"Wrote {len(pair_data):,} pairs -> {pair_path} ({os.path.getsize(pair_path)/1e6:.1f} MB)")

# Write card names
names_path = os.path.join(OUT_DIR, "cardNames.json")
sorted_names = sorted(card_names)
with open(names_path, "w") as f:
    json.dump(sorted_names, f, separators=(",", ":"))
print(f"Wrote {len(sorted_names):,} card names -> {names_path}")
