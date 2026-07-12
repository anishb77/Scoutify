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
# ============================================================
# SCOUTIFY DEVELOPMENT ROADMAP
# ------------------------------------------------------------
# Everything above this line is the original assessment engine
# (grades a single snapshot). Everything below turns that into
# an ongoing loop:
#
#   assess -> pick a goal -> get milestones -> train -> retest
#   -> see progress -> roadmap regenerates automatically
#
# All targets are still computed from the NFL combine data via
# buildRange()/Grade() -- nothing here is a made-up number.
# ============================================================

import json
import os
from datetime import datetime, timezone

# ---- 1. Tier helpers -------------------------------------------------------
# Pulled out of feedback()'s inline if/elif chain so both feedback()
# and the roadmap code share one source of truth for tier boundaries.

TIER_THRESHOLDS = [
    (28, "Needs Work"),
    (46, "Below Average"),
    (64, "Average"),
    (82, "Above Average"),
    (101, "Elite"),
]

def grade_tier(grade):
    for threshold, name in TIER_THRESHOLDS:
        if grade < threshold:
            return name
    return "Elite"

def next_tier_threshold(grade):
    """Grade value where the *next* tier up begins."""
    for threshold, name in TIER_THRESHOLDS:
        if grade < threshold:
            return threshold
    return 100

# ---- 2. Invert Grade(): target grade -> raw stat value needed -------------
# Grade() does: t = (value-floor)/(ceiling-floor) clipped to [0,1],
#               grade = 10 + sqrt(t) * 90
# Solving for value given a target grade:
#               t = ((grade-10)/90) ** 2
#               value = floor + t * (ceiling-floor)

def grade_to_value(position, stat, target_grade):
    floor, ceiling = buildRange(position, stat)
    if ceiling == floor:
        return floor
    target_grade = max(10, min(100, target_grade))
    t = ((target_grade - 10) / 90) ** 2
    t = min(max(t, 0), 1)
    return floor + t * (ceiling - floor)

def round_stat(stat, value):
    """Round a raw stat value to something sensible to show a user."""
    if stat == "Bench":
        return int(round(value))
    if stat in timed_stats:
        return round(value, 2)
    return round(value, 1)

def milestone_met(stat, current_value, milestone_value):
    """Direction-aware comparison: lower is better for timed stats."""
    if stat in timed_stats:
        return current_value <= milestone_value
    return current_value >= milestone_value

# ---- 3. Which raw stat(s) drive each grade category ------------------------

category_stats = {
    "speed": ["40yd"],
    "power": ["Bench"],
    "explosiveness": ["Vertical", "Broad Jump"],
    "agility": ["Shuttle", "3Cone"],
}

# ---- 4. Priorities: primary focus / secondary focus / strength ------------
# Ranks only the categories that are actually relevant for this position
# (reuses category_relevance so a K never gets "power" as a focus area).

def prioritize_categories(position, grades):
    relevance = category_relevance(position)
    relevant = {c: grades[c] for c in grade_cols if relevance[c]}
    ranked = sorted(relevant.items(), key=lambda kv: kv[1])
    return {
        "ranked": ranked,
        "primary_focus": ranked[0][0] if len(ranked) >= 1 else None,
        "secondary_focus": ranked[1][0] if len(ranked) >= 2 else None,
        "strength": ranked[-1][0] if len(ranked) >= 1 else None,
    }

# ---- 5. Goal selection ------------------------------------------------

GOAL_TARGET_GRADE = {
    "above_average": 64,   # start of the "Above Average" tier
    "elite": 82,           # start of the "Elite" tier
}

def resolve_target_grade(current_grade, goal):
    if goal in GOAL_TARGET_GRADE:
        target = GOAL_TARGET_GRADE[goal]
        return target if current_grade < target else min(current_grade + 10, 100)
    # "weakest_areas" (default) and "match_player" (category selection
    # happens elsewhere) both aim for "cross into the next tier up"
    return next_tier_threshold(current_grade)

# ---- 6. Milestones: concrete, data-driven steps toward the goal -----------

def build_stat_milestones(position, stat, current_value, target_grade, n=2):
    target_value = grade_to_value(position, stat, target_grade)
    steps = []
    for i in range(1, n + 1):
        frac = i / n
        raw = current_value + frac * (target_value - current_value)
        raw = round_stat(stat, raw)
        steps.append({"value": raw, "projected_grade": Grade(position, stat, raw)})
    return steps

def build_category_roadmap(position, stats, category, goal="weakest_areas"):
    current_grades = groupGrades(position, stats)
    current_grade = current_grades[category]
    target_grade = resolve_target_grade(current_grade, goal)
    stat_blocks = {}
    for stat in category_stats[category]:
        if stat not in dfs[position].columns:
            continue
        current_value = stats[stat]
        stat_blocks[stat] = {
            "current": current_value,
            "milestones": build_stat_milestones(position, stat, current_value, target_grade),
        }
    return {
        "category": category,
        "current_grade": round(current_grade),
        "current_tier": grade_tier(current_grade),
        "target_grade": target_grade,
        "target_tier": grade_tier(target_grade),
        "stats": stat_blocks,
    }

# ---- 7. Curated training recommendations -----------------------------------
# Deliberately hand-written, not AI-generated -- keeps the roadmap grounded
# in real advice instead of an LLM improvising a training plan.

TRAINING_RECOMMENDATIONS = {
    "speed": [
        "Sprint mechanics and acceleration drills",
        "Resisted sprints (sled push/pull)",
        "Start technique out of a 3-point stance",
    ],
    "power": [
        "Upper-body strength development",
        "Bench press technique work",
        "Progressive overload strength training",
    ],
    "explosiveness": [
        "Jump training (box jumps, depth jumps)",
        "Lower-body power development",
        "Olympic lift variations (cleans, snatches)",
    ],
    "agility": [
        "Cone drill footwork (5-10-5, L-drill)",
        "Change-of-direction technique",
        "Reactive/lateral quickness training",
    ],
}

def build_action_plan(priorities):
    plan = {}
    for role in ("primary_focus", "secondary_focus"):
        category = priorities[role]
        if category:
            plan[role] = {
                "category": category,
                "recommendations": TRAINING_RECOMMENDATIONS[category],
            }
    return plan

# ---- 8. "Match a Player Profile" goal --------------------------------------
# Uses your existing similar_grades() to find realistic comps, then
# auto-picks the strongest one nearby as an aspirational target (unless
# the caller names a specific player).

def match_player_profile(position, stats, player_name=None):
    grades = groupGrades(position, stats)
    relevance = category_relevance(position)
    relevant_cats = [c for c in grade_cols if relevance[c]]

    if player_name is None:
        pool_size = min(10, len(dfsGrades[position]))
        pool = similar_grades(position, grades, pool_size).set_index("Player")
        pool = pool[~pool.index.duplicated(keep="first")]
        composite = pool[relevant_cats].sum(axis=1)
        player_name = composite.idxmax()

    target_rows = dfsGrades[position][dfsGrades[position]["Player"] == player_name]
    if target_rows.empty:
        raise ValueError(f"No player named '{player_name}' found for position {position}")
    target_grades = target_rows.iloc[0][relevant_cats].to_dict()

    gaps = {c: round(target_grades[c] - grades[c], 1) for c in relevant_cats}
    biggest_gap_cat = max(gaps, key=gaps.get)

    player_stats_row = dfs[position][dfs[position]["Player"] == player_name].iloc[0]
    next_targets = {}
    for stat in category_stats[biggest_gap_cat]:
        if stat in dfs[position].columns:
            next_targets[stat] = {
                "current": stats.get(stat),
                "target": player_stats_row[stat],
            }

    return {
        "target_player": player_name,
        "you": {c: round(grades[c]) for c in relevant_cats},
        "target": {c: round(target_grades[c]) for c in relevant_cats},
        "gaps": gaps,
        "biggest_gap_category": biggest_gap_cat,
        "next_targets": next_targets,
    }

# ---- 9. Full roadmap: ties everything above together -----------------------

def generate_roadmap(position, stats, goal="weakest_areas", target_player=None):
    grades = groupGrades(position, stats)
    priorities = prioritize_categories(position, grades)
    relevance = category_relevance(position)

    roadmap = {
        "position": position,
        "goal": goal,
        "profile": {
            c: {
                "grade": round(grades[c]),
                "tier": grade_tier(grades[c]) if relevance[c] else "Not Tested",
            }
            for c in grade_cols
        },
        "priorities": priorities,
    }

    if goal == "match_player":
        roadmap["match"] = match_player_profile(position, stats, target_player)
        focus_categories = [roadmap["match"]["biggest_gap_category"]]
    else:
        focus_categories = [
            c for c in (priorities["primary_focus"], priorities["secondary_focus"]) if c
        ]

    roadmap["category_roadmaps"] = {
        c: build_category_roadmap(position, stats, c, goal) for c in focus_categories
    }
    roadmap["action_plan"] = build_action_plan(priorities)
    return roadmap

# ---- 10. AI-generated personalized explanation (optional layer) -----------
# The numbers above are 100% computed from NFL data. This layer only
# turns the structured roadmap into an encouraging paragraph -- it isn't
# allowed to invent stats. If no API key is configured, it falls back to
# a simple template so the rest of the app still works without one.

def generate_ai_explanation(roadmap):
    prompt = (
        "You are a football performance coach. In 3-4 sentences, explain this "
        "athlete's roadmap in an encouraging, specific way. Do not invent any "
        f"numbers beyond what's given.\n\n{json.dumps(roadmap, default=str, indent=2)}"
    )
    try:
        import anthropic
        client = anthropic.Anthropic()  # expects ANTHROPIC_API_KEY in env
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except Exception:
        primary = roadmap["priorities"]["primary_focus"]
        strength = roadmap["priorities"]["strength"]
        return (
            f"Your biggest opportunity right now is {primary}. "
            f"Your {strength} is already a real strength for a {roadmap['position']} -- "
            f"keep it up while you build {primary} toward your goal."
        )

# ---- 11. Retest + progress tracking ----------------------------------------
# Simple JSON-file store so the demo works with zero setup. Swap
# _load_history/_save_history for a real database later -- everything
# else (save_assessment, get_progress) can stay the same.

PROGRESS_FILE = BASE_DIR / "progress_history.json"

def _load_history(filepath=PROGRESS_FILE):
    if not os.path.exists(filepath):
        return {}
    with open(filepath) as f:
        return json.load(f)

def _save_history(history, filepath=PROGRESS_FILE):
    with open(filepath, "w") as f:
        json.dump(history, f, indent=2)

def save_assessment(user_id, position, stats, filepath=PROGRESS_FILE):
    grades = groupGrades(position, stats)
    entry = {
        "date": datetime.now(timezone.utc).isoformat(),
        "position": position,
        "stats": stats,
        "grades": grades,
    }
    history = _load_history(filepath)
    history.setdefault(user_id, []).append(entry)
    _save_history(history, filepath)
    return entry

def get_progress(user_id, filepath=PROGRESS_FILE):
    history = _load_history(filepath)
    entries = history.get(user_id, [])
    if len(entries) < 2:
        return None
    previous, current = entries[-2], entries[-1]
    deltas = {
        c: round(current["grades"][c] - previous["grades"][c], 1)
        for c in grade_cols
        if c in current["grades"] and c in previous["grades"]
    }
    return {"previous": previous, "current": current, "deltas": deltas}

# ---- 12. Retest -> roadmap regenerates automatically -----------------------

def regenerate_roadmap_after_retest(user_id, position, new_stats, goal="weakest_areas", target_player=None):
    save_assessment(user_id, position, new_stats)
    progress = get_progress(user_id)
    roadmap = generate_roadmap(position, new_stats, goal=goal, target_player=target_player)
    roadmap["progress"] = progress
    return roadmap

# ---- 13. Demo: print a roadmap the way it'd render in the UI --------------

def print_roadmap(roadmap):
    print(f"\n{'='*60}")
    print(f"YOUR ATHLETIC PROFILE ({roadmap['position']})")
    print(f"{'='*60}")
    for c in grade_cols:
        if c not in roadmap["profile"]:
            continue
        info = roadmap["profile"][c]
        tag = ""
        if c == roadmap["priorities"]["primary_focus"]:
            tag = "  <- PRIMARY FOCUS"
        elif c == roadmap["priorities"]["secondary_focus"]:
            tag = "  <- SECONDARY FOCUS"
        elif c == roadmap["priorities"]["strength"]:
            tag = "  <- STRENGTH"
        print(f"{c.capitalize():<15}{info['grade']:<5}{info['tier']:<16}{tag}")

    if "match" in roadmap:
        m = roadmap["match"]
        print(f"\n--- TARGET PROFILE: {m['target_player']} ---")
        print(f"{'':<15}{'YOU':<8}{'TARGET':<8}")
        for c, you_grade in m["you"].items():
            target_grade = m["target"][c]
            check = "  OK" if m["gaps"][c] <= 0 else ""
            print(f"{c.capitalize():<15}{you_grade:<8}{target_grade:<8}{check}")
        print(f"\nBIGGEST GAP: {m['biggest_gap_category']} ({m['gaps'][m['biggest_gap_category']]:+.1f})")
        print("YOUR NEXT TARGET:")
        for stat, vals in m["next_targets"].items():
            print(f"  {stat}: {vals['current']} -> {vals['target']}")

    for category, cr in roadmap["category_roadmaps"].items():
        print(f"\n--- {category.upper()} ---")
        print(f"Current: {cr['current_grade']} ({cr['current_tier']})")
        for stat, block in cr["stats"].items():
            print(f"  {stat}: {block['current']}")
            for i, m in enumerate(block["milestones"], 1):
                print(f"    Milestone {i}: {m['value']}  (projected grade: {m['projected_grade']})")
        print(f"Goal: reach \"{cr['target_tier']}\" ({cr['target_grade']}) for {roadmap['position']}s")

    print("\n--- WHAT TO WORK ON ---")
    for role, block in roadmap["action_plan"].items():
        label = "Primary Focus" if role == "primary_focus" else "Secondary Focus"
        print(f"{label}: {block['category'].capitalize()}")
        for tip in block["recommendations"]:
            print(f"  -> {tip}")

    print("\n--- COACH'S NOTE ---")
    print(generate_ai_explanation(roadmap))


# Demo 1: default goal (improve weakest areas), WR using the HS test stats
demo_roadmap = generate_roadmap("WR", stats_hs, goal="weakest_areas")
print_roadmap(demo_roadmap)

# Demo 2: same athlete, "Match a Player Profile" goal
match_roadmap = generate_roadmap("WR", stats_hs, goal="match_player")
print_roadmap(match_roadmap)

# Demo 3: retest + automatic progress tracking
# (first call establishes a baseline, second simulates a retest after training)
save_assessment("demo_user", "WR", stats_hs)
improved_stats = dict(stats_hs)
improved_stats["Bench"] = 12          # simulate 4 more reps after training
improved_stats["40yd"] = 4.78         # simulate a faster time
updated_roadmap = regenerate_roadmap_after_retest("demo_user", "WR", improved_stats)
print(f"\n{'='*60}")
print("YOUR PROGRESS")
print(f"{'='*60}")
if updated_roadmap["progress"]:
    for c, delta in updated_roadmap["progress"]["deltas"].items():
        arrow = "UP" if delta > 0 else ("DOWN" if delta < 0 else "--")
        print(f"{c.capitalize():<15}{updated_roadmap['progress']['previous']['grades'][c]:.0f} -> "
              f"{updated_roadmap['progress']['current']['grades'][c]:.0f}  ({arrow} {delta:+.1f})")
print_roadmap(updated_roadmap)
