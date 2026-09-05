import importlib.util
import pathlib
import unittest
spec = importlib.util.spec_from_file_location("example", pathlib.Path(__file__).parents[1] / "python" / "example.py")
example = importlib.util.module_from_spec(spec)
spec.loader.exec_module(example)

class ClientTests(unittest.TestCase):
    def test_bounded_query(self):
        self.assertIn('amenity', example.feature_query('cafes', [47.6, -122.34, 47.62, -122.31]))
    def test_rejects_unbounded_and_injected_queries(self):
        for category, bbox in [('cafes', [0,0,1,1]), ('cafes', []), ('cafes];out;', [0,0,.1,.1])]:
            with self.assertRaises(ValueError):
                example.feature_query(category, bbox)
