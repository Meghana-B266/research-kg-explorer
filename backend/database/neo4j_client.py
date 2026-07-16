"""
Neo4j async client wrapper
"""
from neo4j import AsyncGraphDatabase, AsyncDriver
from config import settings
import logging

logger = logging.getLogger(__name__)


class Neo4jClient:
    def __init__(self):
        self.driver: AsyncDriver | None = None

    async def connect(self):
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
        await self._create_constraints()
        logger.info("Neo4j connected ✓")

    async def close(self):
        if self.driver:
            await self.driver.close()

    async def _create_constraints(self):
        """Create uniqueness constraints on first run"""
        queries = [
            "CREATE CONSTRAINT paper_id IF NOT EXISTS FOR (p:Paper) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT author_name IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE",
            "CREATE CONSTRAINT keyword_name IF NOT EXISTS FOR (k:Keyword) REQUIRE k.name IS UNIQUE",
            "CREATE CONSTRAINT method_name IF NOT EXISTS FOR (m:Method) REQUIRE m.name IS UNIQUE",
        ]
        async with self.driver.session() as session:
            for q in queries:
                try:
                    await session.run(q)
                except Exception:
                    pass  # Constraint may already exist

    async def run(self, query: str, **params):
        async with self.driver.session() as session:
            result = await session.run(query, **params)
            return await result.data()

    async def run_write(self, query: str, **params):
        async with self.driver.session() as session:
            result = await session.execute_write(
                lambda tx: tx.run(query, **params).data()
            )
            return result


neo4j_client = Neo4jClient()