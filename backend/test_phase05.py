"""
Phase 0.5 check: save_negative_result must really write a NegativeResult node.

It creates ONE throwaway Paper (id "__phase05_test_paper__") and ONE throwaway
NegativeResult (phrase "__phase05_test_phrase__"), reads them back, then deletes
ONLY those two throwaway nodes. Your existing papers and graph data are never touched.

Run from the backend folder (with the venv active):
    python test_phase05.py
"""
import asyncio
import sys

from database.neo4j_client import neo4j_client
from services.graph_service import save_negative_result

TEST_ID = "__phase05_test_paper__"
TEST_PHRASE = "__phase05_test_phrase__"


async def cleanup():
    """Delete only the throwaway test nodes (matched by their exact marker values)."""
    await neo4j_client.run(
        "MATCH (n:NegativeResult {phrase: $phrase}) DETACH DELETE n",
        phrase=TEST_PHRASE,
    )
    await neo4j_client.run(
        "MATCH (p:Paper {id: $id}) DETACH DELETE p",
        id=TEST_ID,
    )


async def main() -> int:
    await neo4j_client.connect()
    try:
        await cleanup()  # in case an earlier run was interrupted
        await neo4j_client.run("MERGE (p:Paper {id: $id})", id=TEST_ID)

        try:
            await save_negative_result(TEST_ID, TEST_PHRASE, "test context", "limitation")
        except Exception as e:
            print(f"FAIL: save_negative_result raised {type(e).__name__}: {e}")
            return 1

        rows = await neo4j_client.run(
            """
            MATCH (p:Paper {id: $id})-[:HAS_NEGATIVE_RESULT]->(n:NegativeResult {phrase: $phrase})
            RETURN n.type AS type, n.context AS context
            """,
            id=TEST_ID, phrase=TEST_PHRASE,
        )
        if len(rows) == 1 and rows[0]["type"] == "limitation":
            print("PASS: the NegativeResult was saved and read back correctly.")
            return 0

        print(f"FAIL: expected exactly 1 saved NegativeResult with type 'limitation', got: {rows}")
        return 1
    finally:
        await cleanup()
        await neo4j_client.close()
        print("(throwaway test nodes removed)")


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))