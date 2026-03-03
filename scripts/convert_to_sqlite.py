"""Convert big_output.parquet → cards.db (SQLite)"""
import os
import sqlite3
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARQUET = os.path.join(ROOT, "big_output.parquet")
DB_PATH = os.path.join(ROOT, "src", "data", "cards.db")

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

df = pd.read_parquet(PARQUET)
print(f"Loaded {len(df):,} rows from parquet")

# Sort pair names alphabetically for consistent keys
sorted_names = df.apply(lambda r: sorted([r["left_name"], r["right_name"]]), axis=1)
df["card_a"] = sorted_names.str[0]
df["card_b"] = sorted_names.str[1]

# Remove old db if it exists
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Card names table
cur.execute("""
    CREATE TABLE card_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )
""")

all_names = sorted(set(df["card_a"]).union(set(df["card_b"])))
cur.executemany("INSERT INTO card_names (name) VALUES (?)", [(n,) for n in all_names])
print(f"Inserted {len(all_names):,} card names")

# Pairs table with foreign keys to card_names
cur.execute("""
    CREATE TABLE pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_a_id INTEGER NOT NULL REFERENCES card_names(id),
        card_b_id INTEGER NOT NULL REFERENCES card_names(id),
        winrate REAL NOT NULL,
        confident_challenges INTEGER NOT NULL,
        log_multiplier REAL NOT NULL,
        power_rank REAL NOT NULL
    )
""")

# Build name -> id lookup
name_to_id = {name: i + 1 for i, name in enumerate(all_names)}

rows = [
    (
        name_to_id[r["card_a"]],
        name_to_id[r["card_b"]],
        round(r["Winrate"], 4),
        int(r["ConfidentChallenges"]),
        round(r["LogMultiplier"], 4),
        round(r["PowerRank"], 4),
    )
    for _, r in df.iterrows()
]

cur.executemany(
    "INSERT INTO pairs (card_a_id, card_b_id, winrate, confident_challenges, log_multiplier, power_rank) VALUES (?, ?, ?, ?, ?, ?)",
    rows,
)
print(f"Inserted {len(rows):,} pairs")

# Indexes for fast lookups
cur.execute("CREATE INDEX idx_pairs_card_a ON pairs (card_a_id)")
cur.execute("CREATE INDEX idx_pairs_card_b ON pairs (card_b_id)")
cur.execute("CREATE UNIQUE INDEX idx_pairs_ab ON pairs (card_a_id, card_b_id)")
cur.execute("CREATE INDEX idx_card_names_name ON card_names (name)")

conn.commit()
conn.close()

size_mb = os.path.getsize(DB_PATH) / 1e6
print(f"Wrote {DB_PATH} ({size_mb:.1f} MB)")
