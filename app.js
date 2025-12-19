const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_cat_key_123";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// --- AUTHENTICATION ROUTES ---

// Register
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Check if user exists
        const { data: existingUsers, error: checkError } = await supabase
            .from("users")
            .select("*")
            .or(`email.eq.${email},username.eq.${username}`);

        if (checkError) {
            return res.status(500).json({ error: "Query error" });
        }

        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Insert user
        const { data, error: insertError } = await supabase
            .from("users")
            .insert([{ username, email, password: hash }])
            .select();

        if (insertError) {
            return res.status(500).json({ error: "Error registering user" });
        }

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const { data: users, error: queryError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email);

        if (queryError) {
            return res.status(500).json({ error: "Query error" });
        }

        if (!users || users.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Get Cats
app.get("/cats", async (req, res) => {
    try {
        let query = supabase.from("cats").select("*");

        if (req.query.search) {
            query = query.ilike("name", `%${req.query.search}%`);
        }

        if (req.query.tag) {
            query = query.eq("tag", req.query.tag);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: "DB query error" });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Get Cat by ID
app.get("/cats/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("cats")
            .select("*")
            .eq("id", req.params.id);

        if (error) {
            return res.status(500).json({ error: "DB query error" });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Delete Cat by Id
app.delete("/cats/:id", async (req, res) => {
    try {
        const { error } = await supabase
            .from("cats")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            return res.status(500).json({ error: "Query error" });
        }

        res.json({ message: `Record Num :${req.params.id} deleted successfully` });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Add cat
app.post("/cats", async (req, res) => {
    const { name, tag, descreption, img } = req.body;

    try {
        const { data, error } = await supabase
            .from("cats")
            .insert([{ name, tag, descreption, img }])
            .select();

        if (error) {
            return res.status(500).json({ error: "Query error" });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Update cat
app.put("/cats/:id", async (req, res) => {
    const { name, tag, descreption, img } = req.body;

    try {
        const { data, error } = await supabase
            .from("cats")
            .update({ name, tag, descreption, img })
            .eq("id", req.params.id)
            .select();

        if (error) {
            return res.status(500).json({ error: "Query error" });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Get all unique tags
app.get("/tags", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("cats")
            .select("tag")
            .not("tag", "is", null)
            .neq("tag", "");

        if (error) {
            return res.status(500).json({ error: "DB query error" });
        }

        // Get unique tags
        const uniqueTags = [...new Set(data.map(row => row.tag))];
        res.json(uniqueTags);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Only listen in local development
if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Export for Vercel
module.exports = app;