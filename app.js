const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("public"));

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "nodejs",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


//Get Cats
app.get("/cats", (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "DB connection error" });
        }

        // Pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6; // Default to 6 for standard grid
        const offset = (page - 1) * limit;

        let queryBase = "FROM cats";
        let queryParams = [];

        if (req.query.search) {
            queryBase += " WHERE name LIKE ?";
            queryParams.push(`%${req.query.search}%`);
        }

        if (req.query.tag) {
            if (queryBase.includes('WHERE')) {
                queryBase += " AND tag = ?";
            } else {
                queryBase += " WHERE tag = ?";
            }
            queryParams.push(req.query.tag);
        }

        // First query: Get total count
        const countQuery = `SELECT COUNT(*) as total ${queryBase}`;

        connection.query(countQuery, queryParams, (countErr, countRows) => {
            if (countErr) {
                connection.release();
                console.error(countErr);
                return res.status(500).json({ error: "DB query error (count)" });
            }

            const totalItems = countRows[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Second query: Get paginated data
            // We need to reconstruct the select query
            const dataQuery = `SELECT * ${queryBase} LIMIT ? OFFSET ?`;
            // Add limit and offset to params for the second query
            const dataParams = [...queryParams, limit, offset];

            connection.query(dataQuery, dataParams, (dataErr, rows) => {
                connection.release();
                if (dataErr) {
                    console.error(dataErr);
                    return res.status(500).json({ error: "DB query error (data)" });
                }

                res.json({
                    data: rows,
                    meta: {
                        totalItems,
                        totalPages,
                        currentPage: page,
                        itemsPerPage: limit
                    }
                });
            });
        });
    });
});
//Get Cat by ID
app.get("/cats/:id", (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "DB connection error" });
        }
        connection.query("SELECT * FROM cats WHERE id = ?", [req.params.id], (err, rows) => {//sql injection protection
            connection.release();
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "DB query error" });
            }
            res.json(rows);
        });
    });
});

//Delete Cat by Id  
app.delete("/cats/:id", (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("DB connection error", err);
            return res.status(500).json({ error: "DB connection error" });
        }
        connection.query("DELETE FROM cats WHERE id = ?", [req.params.id], (qErr, rows) => {
            connection.release();
            if (qErr) {
                console.error(" query error", qErr);
                return res.status(500).json({ error: " query error" });
            }
            res.json({ message: `Record Num :${req.params.id} deleted successfully` });
        });
    });
});

// Add cat
app.post("/cats", (req, res) => {
    const { name, tag, descreption, img } = req.body
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("DB connection error:", err);
            return res.status(500).json({ error: "DB connection error" })
        }
        connection.query("INSERT INTO cats (name, tag, descreption, img) VALUES (?, ?, ?, ?)", [name, tag, descreption, img], (qErr, rows) => {
            connection.release();
            if (qErr) {
                console.error("Query error:", qErr);
                return res.status(500).json({ error: "Query error" });
            }
            res.json(rows)
        })
    })
});
//update cat
app.put("/cats/:id", (req, res) => {
    const { name, tag, descreption, img } = req.body
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("DB connection error:", err);
            return res.status(500).json({ error: "DB connection error" })
        }
        connection.query("UPDATE cats SET name = ?, tag = ?, descreption = ?, img = ? WHERE id = ?", [name, tag, descreption, img, req.params.id], (qErr, rows) => {
            connection.release();
            if (qErr) {
                console.error("Query error:", qErr);
                return res.status(500).json({ error: "Query error" });
            }
            res.json(rows)
        })
    })
});

// Get all unique tags
app.get("/tags", (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "DB connection error" });
        }
        connection.query("SELECT DISTINCT tag FROM cats WHERE tag IS NOT NULL AND tag != ''", (err, rows) => {
            connection.release();
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "DB query error" });
            }
            // Return just an array of tag strings
            const tags = rows.map(row => row.tag);
            res.json(tags);
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});