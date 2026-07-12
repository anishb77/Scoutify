from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import scoutify

app = FastAPI(title="Scoutify API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoutRequest(BaseModel):
    position: str
    stats: Dict[str, float]
    n_comparisons: int = 5


@app.post("/scout")
def scout(req: ScoutRequest):
    if req.position not in scoutify.dfs:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown position '{req.position}'. Valid: {sorted(scoutify.dfs.keys())}",
        )
    try:
        return scoutify.package_scouting_data(req.position, req.stats, req.n_comparisons)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required stat: {e}")


@app.get("/positions")
def positions():
    return sorted(scoutify.dfs.keys())
