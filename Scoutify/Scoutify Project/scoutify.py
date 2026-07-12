import pandas as pd
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "data" / "nfl.csv"
df = pd.read_csv(CSV_PATH)
df=df.drop(columns=["Year","Round","Pick","Drafted"])

"""Cleaning the height and weight columns"""

def to_inches(x):
 if pd.isnull(x):
   return None
 feet, inches=x.split("-")
 feet, inches = int(feet), int(inches)
 return (feet*12)+inches
df["Height"]=df["Height"].apply(to_inches)
hmedian = df.groupby("Pos")["Height"].transform("median")
df["Height"]=df["Height"].fillna(hmedian)
wmedian = df.groupby("Pos")["Weight"].transform("median")
df["Weight"]=df["Weight"].fillna(wmedian)

dfs = {pos: group.copy() for pos, group in df.groupby("Pos")}
def cleandf(df):
  numeric_cols = df.select_dtypes(include="number").columns
  median = df[numeric_cols].median()
  df[numeric_cols] = df[numeric_cols].fillna(median)
  return df
positions = list(df["Pos"].unique())
for x in positions:
  dfs[x]=cleandf(dfs[x])
dfs['QB'] = dfs['QB'].drop(columns=['Bench'])
dfs['LS'] = dfs['LS'].drop(columns=['Bench'])
dfs['LB'] = dfs['LB'].drop(columns=['3Cone',"Shuttle"])
dfs['K'] = dfs['K'].drop(columns=['Vertical', 'Bench', 'Broad Jump', '3Cone', 'Shuttle'])
dfs['P'] = dfs['P'].drop(columns=['Vertical', 'Bench', 'Broad Jump', '3Cone', 'Shuttle'])
dfs['EDGE'] = dfs['EDGE'].drop(columns=['3Cone', 'Shuttle'])

"""This will be the grading system for the user. Allowing us to compare the user to other players."""

import numpy as np
timed_stats={"40yd", "3Cone", "Shuttle"}
def buildRange(position, stat,):
  posdf=dfs[position]
  col=posdf[stat]
  col_min = col.min()
  col_max = col.max()
  std = col.std()
  if stat in timed_stats:
    ceiling = col_min
    floor = col_max + (1.5*std)
  else:
    ceiling = col_max
    floor = col_min - (1.5*std)
  return floor, ceiling

def Grade(position, stat, value):
  floor, ceiling = buildRange(position, stat)
  if ceiling == floor:
    return 10
  t = (value - floor)/(ceiling - floor)
  t = np.clip(t,0,1)
  grade = 10 + (t ** 0.5) * 90
  return round(grade)

def category_relevance(position):
  posdf = dfs[position]
  return {
      "speed": "40yd" in posdf.columns,
      "power": "Bench" in posdf.columns,
      "explosiveness": ("Broad Jump" in posdf.columns) and ("Vertical" in posdf.columns),
      "agility": ("Shuttle" in posdf.columns) and ("3Cone" in posdf.columns),
  }

def groupGrades(position, stats):
  posdf=dfs[position]
  if "40yd" in posdf.columns:
    speed = Grade(position, "40yd", stats["40yd"])
  else:
    speed=10
  if "Bench" in posdf.columns:
    power = Grade(position, "Bench", stats["Bench"])
  else:
    power=10
  if ("Broad Jump" in posdf.columns) & ("Vertical" in posdf.columns):
    explosiveness=Grade(position, "Broad Jump", stats["Broad Jump"])+Grade(position, "Vertical", stats["Vertical"])
    explosiveness/=2
  else:
    explosiveness=10
  if ("Shuttle" in posdf.columns) & ("3Cone" in posdf.columns):
    agility=Grade(position, "Shuttle", stats["Shuttle"])+Grade(position, "3Cone", stats["3Cone"])
    agility/=2
  else:
    agility=10
  return{"speed":speed,"power":power,"explosiveness":explosiveness,"agility":agility}

def gradeDF(position):
  posdf=dfs[position]
  idx = posdf.index
  if "40yd" in posdf.columns:
    speed = Grade(position, "40yd", posdf["40yd"])
  else:
    speed = pd.Series(10, index=idx)
  if "Bench" in posdf.columns:
    power = Grade(position, "Bench", posdf["Bench"])
  else:
    power = pd.Series(10, index=idx)
  if ("Broad Jump" in posdf.columns) & ("Vertical" in posdf.columns):
    explosiveness=Grade(position, "Broad Jump", posdf["Broad Jump"])+Grade(position, "Vertical", posdf["Vertical"])
    explosiveness/=2
  else:
    explosiveness = pd.Series(10, index=idx)
  if ("Shuttle" in posdf.columns) & ("3Cone" in posdf.columns):
    agility=Grade(position, "Shuttle", posdf["Shuttle"])+Grade(position, "3Cone", posdf["3Cone"])
    agility/=2
  else:
    agility = pd.Series(10, index=idx)
  return{"speed":speed,"power":power,"explosiveness":explosiveness,"agility":agility}
dfsGrades = {}
for position in dfs:
    dfsGrades[position] = pd.DataFrame(gradeDF(position))
    dfsGrades[position]["Player"] = dfs[position]["Player"]

from sklearn.neighbors import NearestNeighbors
grade_cols = ["speed", "power", "explosiveness", "agility"]
def similar_grades(position, grades, n):
    posdf = dfsGrades[position]
    n = min(n, len(posdf))
    X = posdf[grade_cols].values
    model = NearestNeighbors(n_neighbors=n).fit(X)
    target = np.array([[grades[c] for c in grade_cols]])
    distances, indices = model.kneighbors(target)
    return posdf.iloc[indices[0]][["Player"] + grade_cols]

# ROADMAP START
# Everything below builds the two data-driven roadmaps that replace the
# old static tier-only feedback: (1) a "next milestone" roadmap that
# tells the athlete the exact raw combine numbers they need to hit to
# reach the next grade tier, and (2) a "closest comp" roadmap that shows
# exactly how far off they are from their #1 statistical comp and what
# raw numbers would close that gap.

# Which raw stat column(s) feed each of the four grading pillars.
CATEGORY_STATS = {
    "speed": ["40yd"],
    "power": ["Bench"],
    "explosiveness": ["Broad Jump", "Vertical"],
    "agility": ["Shuttle", "3Cone"],
}

# Same tier cutoffs the frontend already uses for feedbackTier().
TIER_EDGES = [28, 46, 64, 82, 100]
TIER_NAMES = ["Needs Work", "Below Average", "Average", "Above Average", "Elite"]

def get_tier(grade):
  for edge, name in zip(TIER_EDGES, TIER_NAMES):
    if grade < edge:
      return name
  return TIER_NAMES[-1]

def next_milestone(grade):
  """Returns (next_tier_grade, next_tier_name), or (None, None) if maxed."""
  for edge, name in zip(TIER_EDGES, TIER_NAMES):
    if grade < edge:
      return edge, name
  return None, None

def invert_grade(position, stat, target_grade):
  """Inverse of Grade(): given a target grade (10-100), returns the raw
  stat value needed to hit it, using the same floor/ceiling range Grade()
  itself uses."""
  floor, ceiling = buildRange(position, stat)
  if ceiling == floor:
    return None
  t = ((target_grade - 10) / 90) ** 2
  t = float(np.clip(t, 0, 1))
  value = floor + t * (ceiling - floor)
  return round(float(value), 2)

def target_roadmap(position, stats, grades):
  """Roadmap #1: data-driven target roadmap. For every pillar relevant to
  this position, shows the current grade/tier and the exact raw stat
  numbers needed to reach the next tier up."""
  relevance = category_relevance(position)
  posdf = dfs[position]
  roadmap = {}
  for category, stat_cols in CATEGORY_STATS.items():
    if not relevance.get(category):
      continue
    cols = [c for c in stat_cols if c in posdf.columns]
    if not cols:
      continue
    grade = grades[category]
    next_grade, next_tier = next_milestone(grade)
    entry = {
        "grade": grade,
        "tier": get_tier(grade),
        "next_grade": next_grade,
        "next_tier": next_tier,
        "targets": [],
    }
    if next_grade is not None:
      for stat in cols:
        target_value = invert_grade(position, stat, next_grade)
        if target_value is None:
          continue
        entry["targets"].append({
            "stat": stat,
            "current": stats.get(stat),
            "target": target_value,
        })
    roadmap[category] = entry
  return roadmap

def get_player_row(position, player_name):
  posdf = dfs[position]
  match = posdf[posdf["Player"] == player_name]
  if match.empty:
    return None
  return match.iloc[0]

def comparison_roadmap(position, stats, grades):
  """Roadmap #2: player-comparison roadmap. Finds the single closest NFL
  comp, shows the grade gap on each pillar, and for every pillar where
  the athlete trails, lists the exact raw stat move that would close it
  (using the comp's own numbers as the target)."""
  top = similar_grades(position, grades, 1)
  if top.empty:
    return None
  comp = top.iloc[0]
  player_name = comp["Player"]
  diffs = {c: round(float(grades[c] - comp[c]), 1) for c in grade_cols}

  comp_row = get_player_row(position, player_name)
  targets = []
  if comp_row is not None:
    for category, stat_cols in CATEGORY_STATS.items():
      if diffs.get(category, 0) >= 0:
        continue
      for stat in stat_cols:
        if stat not in dfs[position].columns:
          continue
        current_val = stats.get(stat)
        comp_val = comp_row.get(stat)
        if current_val is None or comp_val is None or pd.isnull(comp_val):
          continue
        if stat in timed_stats:
          improved = comp_val < current_val
        else:
          improved = comp_val > current_val
        if improved:
          targets.append({
              "category": category,
              "stat": stat,
              "current": current_val,
              "target": round(float(comp_val), 2),
          })

  return {
      "player": player_name,
      "diffs": diffs,
      "targets": targets,
  }

def package_scouting_data(position, stats, n_comparisons=5):
    grades = groupGrades(position, stats)
    comparisons_df = similar_grades(
        position,
        grades,
        n_comparisons
    )
    comparisons = comparisons_df.to_dict(orient="records")
    return {
        "position": position,
        "input_stats": stats,
        "grades": grades,
        "comparisons": comparisons,
        "target_roadmap": target_roadmap(position, stats, grades),
        "comparison_roadmap": comparison_roadmap(position, stats, grades),
    }
