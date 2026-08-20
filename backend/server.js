const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

console.log("TOUR EXPENSE SERVER STARTING...");

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json());


// ==================================================
// MYSQL CONNECTION
// ==================================================

// Railway MySQL automatically provides these
// environment variables.
//
// Local computer-এ চাইলে এগুলো নিজের MySQL values দিয়ে
// environment variable হিসেবে দিতে পারবে.

const db = mysql.createPool({

    host: process.env.MYSQLHOST || "localhost",

    port: process.env.MYSQLPORT
        ? Number(process.env.MYSQLPORT)
        : 3306,

    user: process.env.MYSQLUSER || "root",

    password: process.env.MYSQLPASSWORD || "1234@shoayeb",

    database: process.env.MYSQLDATABASE || "tour_expense",

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

});


// ==================================================
// DATABASE TEST
// ==================================================

db.getConnection((err, connection) => {

    if (err) {

        console.error(
            "MySQL connection failed:",
            err.message
        );

        return;

    }

    console.log("Connected to MySQL!");

    connection.release();

});



// ==================================================
// CREATE TABLES
// ==================================================

function createTables() {

    // ----------------------------------------------
    // USERS TABLE
    // ----------------------------------------------

    const createUsers = `

        CREATE TABLE IF NOT EXISTS users (

            id INT AUTO_INCREMENT PRIMARY KEY,

            name VARCHAR(255) NOT NULL,

            email VARCHAR(255) NOT NULL UNIQUE,

            password VARCHAR(255) NOT NULL

        )

    `;


    db.query(createUsers, (err) => {

        if (err) {

            console.error(
                "Failed to create users table:",
                err.message
            );

            return;

        }

        console.log(
            "users table ready."
        );


        // ------------------------------------------
        // TOUR MATES TABLE
        // ------------------------------------------

        const createTourMates = `

            CREATE TABLE IF NOT EXISTS tour_mates (

                id INT AUTO_INCREMENT PRIMARY KEY,

                name VARCHAR(255) NOT NULL,

                user_id INT NOT NULL,

                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE

            )

        `;


        db.query(createTourMates, (err) => {

            if (err) {

                console.error(
                    "Failed to create tour_mates table:",
                    err.message
                );

                return;

            }

            console.log(
                "tour_mates table ready."
            );


            // --------------------------------------
            // EXPENSES TABLE
            // --------------------------------------

            const createExpenses = `

                CREATE TABLE IF NOT EXISTS expenses (

                    id INT AUTO_INCREMENT PRIMARY KEY,

                    description VARCHAR(255) NOT NULL,

                    amount DECIMAL(10,2) NOT NULL,

                    payer_id INT NOT NULL,

                    user_id INT NOT NULL,

                    FOREIGN KEY (payer_id)
                    REFERENCES tour_mates(id)
                    ON DELETE CASCADE,

                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE

                )

            `;


            db.query(createExpenses, (err) => {

                if (err) {

                    console.error(
                        "Failed to create expenses table:",
                        err.message
                    );

                    return;

                }

                console.log(
                    "expenses table ready."
                );

            });

        });

    });

}


createTables();



// ==================================================
// TEST SERVER
// ==================================================

app.get("/", (req, res) => {

    res.send(
        "Tour Expense API is running!"
    );

});


// SIGN UP

app.post("/api/signup", async (req, res) => {

    const { name, email, password } = req.body;

    // সব তথ্য দেওয়া হয়েছে কিনা
    if (!name || !email || !password) {

        return res.status(400).json({
            error: "Name, email and password are required"
        });

    }

    // Email আগে আছে কিনা check
    const checkSql = `
        SELECT id
        FROM users
        WHERE email = ?
    `;

    db.query(
        checkSql,
        [email.trim()],
        async (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Database error"
                });

            }

            // Email already exists
            if (results.length > 0) {

                return res.status(409).json({
                    error: "Email already registered"
                });

            }

            // Password hash করা
            const hashedPassword =
                await bcrypt.hash(password, 10);

            // Database-এ user save
            const sql = `
                INSERT INTO users
                (name, email, password)
                VALUES (?, ?, ?)
            `;

            db.query(
                sql,
                [
                    name.trim(),
                    email.trim(),
                    hashedPassword
                ],
                (err, result) => {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            error: "Failed to create account"
                        });

                    }

                    res.status(201).json({

                        message:
                            "Account created successfully",

                        user: {

                            id: result.insertId,

                            name: name.trim(),

                            email: email.trim()

                        }

                    });

                }
            );

        }
    );

});


// LOGIN

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    // Email এবং password দেওয়া হয়েছে কিনা
    if (!email || !password) {

        return res.status(400).json({
            error: "Email and password are required"
        });

    }

    // Email দিয়ে user খোঁজা
    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
    `;

    db.query(
        sql,
        [email.trim()],
        async (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Database error"
                });

            }

            // User পাওয়া যায়নি
            if (results.length === 0) {

                return res.status(401).json({
                    error: "Invalid email or password"
                });

            }

            const user = results[0];

            // Password মিলানো
            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordMatch) {

                return res.status(401).json({
                    error: "Invalid email or password"
                });

            }

            // JWT token তৈরি
            const token = jwt.sign(

                {
                    id: user.id,
                    email: user.email
                },

                "tour_expense_secret",

                {
                    expiresIn: "7d"
                }

            );

            // Login successful
            res.json({

                message: "Login successful",

                token: token,

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email

                }

            });

        }
    );

});


// AUTHENTICATION MIDDLEWARE

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {

        return res.status(401).json({
            error: "Access denied. Please login first."
        });

    }

    jwt.verify(
        token,
        "tour_expense_secret",
        (err, user) => {

            if (err) {

                return res.status(403).json({
                    error: "Invalid or expired token"
                });

            }

            req.user = user;

            next();

        }
    );

}


// ==================================================
// GET TOUR MATES
// ==================================================

app.get("/api/tourmates", authenticateToken, (req, res) => {

    const sql = `
    SELECT *
    FROM tour_mates
    WHERE user_id = ?
    ORDER BY id ASC
`;


    db.query(sql, [req.user.id], (err, results) => {

        if (err) {

            console.error(
                "Get tour mates error:",
                err.message
            );

            return res.status(500).json({

                error:
                    "Failed to get tour mates"

            });

        }


        res.json(results);

    });

});


// ==================================================
// ADD TOUR MATE
// ==================================================

app.post("/api/tourmates", authenticateToken, (req, res) => {

    const { name } = req.body;
    const userId = req.user.id;


    if (!name || name.trim() === "") {

        return res.status(400).json({

            error:
                "Name is required"

        });

    }


   const sql = `
    INSERT INTO tour_mates
    (name, user_id)
    VALUES (?, ?)
`;


    db.query(

        sql,

        [name.trim(), userId],

        (err, result) => {

            if (err) {

                console.error(
                    "Add tour mate error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Failed to add tour mate"

                });

            }


            res.json({

                message:
                    "Tour mate added successfully",

                id:
                    result.insertId,

                name:
                    name.trim()

            });

        }

    );

});


// ==================================================
// DELETE TOUR MATE
// ==================================================

app.delete("/api/tourmates/:id", authenticateToken, (req, res) => {

    const id = req.params.id;


    console.log(
        "Deleting tour mate:",
        id
    );


    // Delete related expenses first.
    // This also works even if foreign key
    // is configured differently.

    const deleteExpenses = `

        DELETE FROM expenses

        WHERE payer_id = ?

    `;


    db.query(

        deleteExpenses,

        [id],

        (err) => {

            if (err) {

                console.error(
                    "Delete expenses error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Failed to delete related expenses"

                });

            }


            const deleteMate = `

                DELETE FROM tour_mates

                WHERE id = ?

            `;


            db.query(

                deleteMate,

                [id],

                (err, result) => {

                    if (err) {

                        console.error(
                            "Delete mate error:",
                            err.message
                        );

                        return res.status(500).json({

                            error:
                                "Failed to delete tour mate"

                        });

                    }


                    if (
                        result.affectedRows === 0
                    ) {

                        return res.status(404).json({

                            error:
                                "Tour mate not found"

                        });

                    }


                    console.log(
                        "Tour mate deleted:",
                        id
                    );


                    res.json({

                        message:
                            "Tour mate deleted successfully"

                    });

                }

            );

        }

    );

});


// ==================================================
// GET EXPENSES
// ==================================================

app.get("/api/expenses", authenticateToken, (req, res) => {

    const sql = `

        SELECT

            expenses.id,

            expenses.description,

            expenses.amount,

            expenses.payer_id,

            tour_mates.name AS payer_name

        FROM expenses

        JOIN tour_mates

        ON expenses.payer_id =
           tour_mates.id

           WHERE expenses.user_id = ?
        ORDER BY expenses.id ASC

    `;


    db.query(
    sql,
    [req.user.id],
    (err, results) => {

            if (err) {

                console.error(
                    "Get expenses error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Failed to get expenses"

                });

            }


            res.json(results);

        }

    );

});


// ==================================================
// ADD EXPENSE
// ==================================================

app.post("/api/expenses", authenticateToken, (req, res) => {

    const {

        description,

        amount,

        payerId

    } = req.body;

    const userId = req.user.id;


    if (

        !description ||

        amount === undefined ||

        amount === null ||

        Number(amount) <= 0 ||

        !payerId

    ) {

        return res.status(400).json({

            error:
                "Description, amount and payer are required"

        });

    }


    const sql = `

    INSERT INTO expenses

    (
        description,
        amount,
        payer_id,
        user_id
    )

    VALUES (?, ?, ?, ?)

`;


    db.query(

        sql,

       [
    description.trim(),
    amount,
    payerId,
    userId
],

        (err, result) => {

            if (err) {

                console.error(
                    "Add expense error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Failed to add expense"

                });

            }


            res.json({

                message:
                    "Expense added successfully",

                id:
                    result.insertId

            });

        }

    );

});



// ==================================================
// DELETE EXPENSE
// ==================================================

app.delete("/api/expenses/:id", authenticateToken, (req, res) => {

    const id = req.params.id;

    console.log(
        "Deleting expense:",
        id,
        "for user:",
        req.user.id
    );


    const sql = `

        DELETE FROM expenses

        WHERE id = ?

        AND user_id = ?

    `;


    db.query(

        sql,

        [
            id,
            req.user.id
        ],

        (err, result) => {

            if (err) {

                console.error(
                    "Delete expense error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Failed to delete expense"

                });

            }


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    error:
                        "Expense not found"

                });

            }


            console.log(
                "Expense deleted:",
                id
            );


            res.json({

                message:
                    "Expense deleted successfully"

            });

        }

    );

});





// ==================================================
// RESET ALL
// ==================================================

app.delete("/api/reset", authenticateToken, (req, res) => {

    console.log(
        "Resetting data for user:",
        req.user.id
    );


    // ----------------------------------------------
    // Delete only this user's expenses
    // ----------------------------------------------

    const deleteExpenses = `

        DELETE FROM expenses

        WHERE user_id = ?

    `;


    db.query(

        deleteExpenses,

        [req.user.id],

        (err) => {

            if (err) {

                console.error(
                    "Reset expenses error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Failed to delete expenses"

                });

            }


            // ------------------------------------------
            // Delete only this user's tour mates
            // ------------------------------------------

            const deleteMates = `

                DELETE FROM tour_mates

                WHERE user_id = ?

            `;


            db.query(

                deleteMates,

                [req.user.id],

                (err) => {

                    if (err) {

                        console.error(
                            "Reset mates error:",
                            err.message
                        );

                        return res.status(500).json({

                            error:
                                "Failed to delete tour mates"

                        });

                    }


                    console.log(
                        "User data reset successfully:",
                        req.user.id
                    );


                    res.json({

                        message:
                            "Your tour mates and expenses have been deleted successfully"

                    });

                }

            );

        }

    );

});



// ==================================================
// START SERVER
// ==================================================

// Railway automatically gives us PORT.
// Local computer-এ 3000 ব্যবহার হবে.

const PORT =
    process.env.PORT || 3000;


app.listen(

    PORT,

    () => {

        console.log(

            `Server running on port ${PORT}`

        );

    }

);