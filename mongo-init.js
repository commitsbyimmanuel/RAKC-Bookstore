db = db.getSiblingDB("admin");

db.createUser({
  user: "appuser",
  pwd: process.env.APPUSER_PASSWORD,
  roles: [
    { role: "readWrite", db: "Bookstore" },
  ]
});