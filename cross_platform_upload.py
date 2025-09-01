import json
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# Paste your MongoDB Atlas connection string here
connection_string = "paste_your_mongodb_connection_string_here"

client = MongoClient(connection_string)
db = client["instagram_db"]

def convert_extended_json(obj):
    """Convert MongoDB Extended JSON to Python types"""
    if isinstance(obj, dict):
        if "$oid" in obj:
            return ObjectId(obj["$oid"])
        elif "$date" in obj:
            return datetime.fromisoformat(obj["$date"].replace('Z', '+00:00'))
        else:
            return {k: convert_extended_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_extended_json(item) for item in obj]
    else:
        return obj

# Upload users
with open("../data/students_users.json", "r", encoding='utf-8') as f:
    users = json.load(f)
    users = convert_extended_json(users)
db.users.drop()
db.users.insert_many(users)
print(f"Users: {len(users)} uploaded")

# Upload posts  
with open("../data/students_posts.json", "r", encoding='utf-8') as f:
    posts = json.load(f)
    posts = convert_extended_json(posts)
db.posts.drop()
db.posts.insert_many(posts)
print(f"Posts: {len(posts)} uploaded")

# Upload followers
with open("../data/students_followers.json", "r", encoding='utf-8') as f:
    followers = json.load(f)
    followers = convert_extended_json(followers)
db.followers.drop()
db.followers.insert_many(followers)
print(f"Followers: {len(followers)} uploaded")

print("Done!")