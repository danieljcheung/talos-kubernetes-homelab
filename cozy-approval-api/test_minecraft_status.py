import json
import unittest

from minecraft_status import MinecraftStatusError, parse_status_payload


class MinecraftStatusTests(unittest.TestCase):
    def test_parse_status_payload_returns_aggregate_counts(self):
        payload = json.dumps(
            {"version": {"name": "1.20.1"}, "players": {"online": 3, "max": 15}}
        ).encode()

        self.assertEqual(parse_status_payload(payload), {"players": 3, "maxPlayers": 15})

    def test_parse_status_payload_rejects_missing_player_counts(self):
        with self.assertRaises(MinecraftStatusError):
            parse_status_payload(b'{"description":"Cozy Friends"}')

    def test_parse_status_payload_rejects_impossible_counts(self):
        with self.assertRaises(MinecraftStatusError):
            parse_status_payload(b'{"players":{"online":16,"max":15}}')


if __name__ == "__main__":
    unittest.main()
