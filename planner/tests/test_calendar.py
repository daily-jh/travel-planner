import copy
import json
import re
import sys
import unittest
from pathlib import Path

PLANNER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLANNER))
import build


class CalendarTest(unittest.TestCase):
    def test_uid_survives_time_and_order_changes(self):
        folder = PLANNER.parent / "trips" / "2027-03-fukuoka"
        trip = json.loads((folder / "trip.json").read_text(encoding="utf-8"))
        original, count = build.render_ics(folder.name, trip)
        edited = copy.deepcopy(trip)
        day = edited["days"][0]
        day["blocks"][0]["time"] = "06:30–07:40"
        day["blocks"].reverse()
        changed, new_count = build.render_ics(folder.name, edited)
        pattern = r"^UID:(.+)"
        self.assertEqual(count, new_count)
        old_uids = set(re.findall(pattern, original, re.M))
        self.assertEqual(len(old_uids), count)
        self.assertEqual(old_uids, set(re.findall(pattern, changed, re.M)))
        self.assertNotEqual(original, changed)
