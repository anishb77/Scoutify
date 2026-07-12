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

"""Stats to test with"""

stats_hs = {"Height": 70, "Weight": 175, "40yd": 4.85, "Vertical": 30.0, "Bench": 8, "Broad Jump": 105, "3Cone": 7.3, "Shuttle": 4.4,}
stats = {"Height": 75, "Weight": 200, "40yd": 4.45, "Vertical": 38.0, "Bench": 15, "Broad Jump": 122,  "3Cone": 6.9,"Shuttle": 4.1}

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
grades=groupGrades("WR",stats_hs)
gradeset=similar_grades("WR",grades,5)
bestfit=similar_grades("WR",grades,1)
print(gradeset)
print(bestfit)

def feedback(position, grades):
    relevance = category_relevance(position)
    result = {}
    for c in grade_cols:
        if not relevance[c]:
            continue
        result[c] = grade_tier(grades[c])
    return result

def package_scouting_data(position, stats, n_comparisons=5):
    grades = groupGrades(position, stats)
    grade_feedback = feedback(position, grades)
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
        "feedback": grade_feedback,
        "comparisons": comparisons
    }
