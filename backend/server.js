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

const db = mysql.createPool({

    host: process.env.MYSQLHOST || "localhost",

    port: process.env.MYSQLPORT
        ? Number(process.env.MYSQLPORT)
        : 3306,

    user: process.env.MYSQLUSER || "root",

    password:
        process.env.MYSQLPASSWORD || "1234@shoayeb",

    database:
        process.env.MYSQLDATABASE || "tour_expense",

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

    // ==================================================
    // USERS TABLE
    // ==================================================

    const createUsers = `

        CREATE TABLE IF NOT EXISTS users (

            id INT AUTO_INCREMENT PRIMARY KEY,

            name VARCHAR(255) NOT NULL,

            email VARCHAR(255) NOT NULL UNIQUE,

            number VARCHAR(30),

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

        console.log("users table ready.");


        // ==================================================
        // TOUR MATES TABLE
        // ==================================================

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

            console.log("tour_mates table ready.");


            // ==================================================
            // EXPENSES TABLE
            // ==================================================

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

                console.log("expenses table ready.");


                // ==================================================
                // PERSONAL EXPENSES TABLE
                // ==================================================

                const createPersonalExpenses = `

                    CREATE TABLE IF NOT EXISTS personal_expenses (

                        id INT AUTO_INCREMENT PRIMARY KEY,

                        description VARCHAR(255) NOT NULL,

                        amount DECIMAL(10,2) NOT NULL,

                        user_id INT NOT NULL,

                        FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE

                    )

                `;


                db.query(
                    createPersonalExpenses,
                    (err) => {

                        if (err) {

                            console.error(
                                "Failed to create personal_expenses table:",
                                err.message
                            );

                            return;

                        }

                        console.log(
                            "personal_expenses table ready."
                        );

                    }
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


// ==================================================
// SIGN UP
// ==================================================

app.post("/api/signup", async (req, res) => {

    const {
        name,
        email,
        number,
        password
    } = req.body;


    // Validation

    if (
        !name ||
        !email ||
        !number ||
        !password
    ) {

        return res.status(400).json({

            error:
                "Name, email, number and password are required"

        });

    }


    // Check email

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

                console.error(
                    "Signup check error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Database error"

                });

            }


            // Email already exists

            if (results.length > 0) {

                return res.status(409).json({

                    error:
                        "Email already registered"

                });

            }


            try {

                // Hash password

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );


                // Insert user

                const sql = `

                    INSERT INTO users

                    (
                        name,
                        email,
                        number,
                        password
                    )

                    VALUES (?, ?, ?, ?)

                `;


                db.query(

                    sql,

                    [
                        name.trim(),
                        email.trim(),
                        number.trim(),
                        hashedPassword
                    ],

                    (err, result) => {

                        if (err) {

                            console.error(
                                "Signup insert error:",
                                err.message
                            );

                            return res.status(500).json({

                                error:
                                    "Failed to create account"

                            });

                        }


                        res.status(201).json({

                            message:
                                "Account created successfully",

                            user: {

                                id:
                                    result.insertId,

                                name:
                                    name.trim(),

                                email:
                                    email.trim(),

                                number:
                                    number.trim()

                            }

                        });

                    }

                );

            }

            catch (error) {

                console.error(
                    "Password hashing error:",
                    error.message
                );

                return res.status(500).json({

                    error:
                        "Failed to create account"

                });

            }

        }

    );

});


// ==================================================
// LOGIN
// ==================================================

app.post("/api/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (!email || !password) {

        return res.status(400).json({

            error:
                "Email and password are required"

        });

    }


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

                console.error(
                    "Login database error:",
                    err.message
                );

                return res.status(500).json({

                    error:
                        "Database error"

                });

            }


            if (results.length === 0) {

                return res.status(401).json({

                    error:
                        "Invalid email or password"

                });

            }


            const user =
                results[0];


            // Compare password

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res.status(401).json({

                    error:
                        "Invalid email or password"

                });

            }


            // Create JWT

            const token =
                jwt.sign(

                    {

                        id:
                            user.id,

                        email:
                            user.email

                    },

                    "tour_expense_secret",

                    {

                        expiresIn:
                            "7d"

                    }

                );


            res.json({

                message:
                    "Login successful",

                token:
                    token,

                user: {

                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    number:
                        user.number

                }

            });

        }

    );

});


// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers["authorization"];


    const token =
        authHeader &&
        authHeader.split(" ")[1];


    if (!token) {

        return res.status(401).json({

            error:
                "Access denied. Please login first."

        });

    }


    jwt.verify(

        token,

        "tour_expense_secret",

        (err, user) => {

            if (err) {

                return res.status(403).json({

                    error:
                        "Invalid or expired token"

                });

            }


            req.user = user;

            next();

        }

    );

}


// ==================================================
// GET PROFILE
// ==================================================

app.get(
    "/api/profile",
    authenticateToken,
    (req, res) => {

        const sql = `

            SELECT

                id,
                name,
                email,
                number

            FROM users

            WHERE id = ?

        `;


        db.query(

            sql,

            [req.user.id],

            (err, results) => {

                if (err) {

                    console.error(
                        "Get profile error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to get profile"

                    });

                }


                if (results.length === 0) {

                    return res.status(404).json({

                        error:
                            "User not found"

                    });

                }


                res.json(results[0]);

            }

        );

    }

);


// ==================================================
// GET TOUR MATES
// ==================================================

app.get(
    "/api/tourmates",
    authenticateToken,
    (req, res) => {

        const sql = `

            SELECT *

            FROM tour_mates

            WHERE user_id = ?

            ORDER BY id ASC

        `;


        db.query(

            sql,

            [req.user.id],

            (err, results) => {

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

            }

        );

    }

);


// ==================================================
// ADD TOUR MATE
// ==================================================

app.post(
    "/api/tourmates",
    authenticateToken,
    (req, res) => {

        const {
            name
        } = req.body;


        const userId =
            req.user.id;


        if (
            !name ||
            name.trim() === ""
        ) {

            return res.status(400).json({

                error:
                    "Name is required"

            });

        }


        const sql = `

            INSERT INTO tour_mates

            (
                name,
                user_id
            )

            VALUES (?, ?)

        `;


        db.query(

            sql,

            [
                name.trim(),
                userId
            ],

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

    }

);


// ==================================================
// DELETE TOUR MATE
// ==================================================

app.delete(
    "/api/tourmates/:id",
    authenticateToken,
    (req, res) => {

        const id =
            req.params.id;

        const userId =
            req.user.id;


        // Delete expenses first

        const deleteExpenses = `

            DELETE FROM expenses

            WHERE payer_id = ?

            AND user_id = ?

        `;


        db.query(

            deleteExpenses,

            [
                id,
                userId
            ],

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


                // Delete tour mate

                const deleteMate = `

                    DELETE FROM tour_mates

                    WHERE id = ?

                    AND user_id = ?

                `;


                db.query(

                    deleteMate,

                    [
                        id,
                        userId
                    ],

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


                        res.json({

                            message:
                                "Tour mate deleted successfully"

                        });

                    }

                );

            }

        );

    }

);


// ==================================================
// GET TOUR EXPENSES
// ==================================================

app.get(
    "/api/expenses",
    authenticateToken,
    (req, res) => {

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

    }

);


// ==================================================
// ADD TOUR EXPENSE
// ==================================================

app.post(
    "/api/expenses",
    authenticateToken,
    (req, res) => {

        const {
            description,
            amount,
            payerId
        } = req.body;


        const userId =
            req.user.id;


        if (

            !description ||

            description.trim() === "" ||

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


        // Check payer belongs to current user

        const checkPayer = `

            SELECT id

            FROM tour_mates

            WHERE id = ?

            AND user_id = ?

        `;


        db.query(

            checkPayer,

            [
                payerId,
                userId
            ],

            (err, results) => {

                if (err) {

                    console.error(
                        "Check payer error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Database error"

                    });

                }


                if (
                    results.length === 0
                ) {

                    return res.status(403).json({

                        error:
                            "Invalid tour mate"

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

            }

        );

    }

);


// ==================================================
// DELETE TOUR EXPENSE
// ==================================================

app.delete(
    "/api/expenses/:id",
    authenticateToken,
    (req, res) => {

        const id =
            req.params.id;

        const userId =
            req.user.id;


        const sql = `

            DELETE FROM expenses

            WHERE id = ?

            AND user_id = ?

        `;


        db.query(

            sql,

            [
                id,
                userId
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


                res.json({

                    message:
                        "Expense deleted successfully"

                });

            }

        );

    }

);


// ==================================================
// GET PERSONAL EXPENSES
// ==================================================

app.get(
    "/api/personal-expenses",
    authenticateToken,
    (req, res) => {

        const sql = `

            SELECT

                id,

                description,

                amount

            FROM personal_expenses

            WHERE user_id = ?

            ORDER BY id ASC

        `;


        db.query(

            sql,

            [req.user.id],

            (err, results) => {

                if (err) {

                    console.error(
                        "Get personal expenses error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to get personal expenses",

                        details:
                            err.message

                    });

                }


                res.json(results);

            }

        );

    }

);


// ==================================================
// ADD PERSONAL EXPENSE
// ==================================================

app.post(
    "/api/personal-expenses",
    authenticateToken,
    (req, res) => {

        const {
            description,
            amount
        } = req.body;


        const userId =
            req.user.id;


        console.log(
            "Adding personal expense:",
            {
                description,
                amount,
                userId
            }
        );


        // Validation

        if (
            !description ||
            description.trim() === ""
        ) {

            return res.status(400).json({

                error:
                    "Description is required"

            });

        }


        if (
            amount === undefined ||
            amount === null ||
            amount === "" ||
            Number(amount) <= 0
        ) {

            return res.status(400).json({

                error:
                    "Valid amount is required"

            });

        }


        const sql = `

            INSERT INTO personal_expenses

            (
                description,
                amount,
                user_id
            )

            VALUES (?, ?, ?)

        `;


        db.query(

            sql,

            [
                description.trim(),
                Number(amount),
                userId
            ],

            (err, result) => {

                if (err) {

                    console.error(
                        "Add personal expense error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to add personal expense",

                        details:
                            err.message

                    });

                }


                console.log(
                    "Personal expense added:",
                    result.insertId
                );


                res.status(201).json({

                    message:
                        "Personal expense added successfully",

                    id:
                        result.insertId,

                    description:
                        description.trim(),

                    amount:
                        Number(amount)

                });

            }

        );

    }

);


// ==================================================
// DELETE PERSONAL EXPENSE
// ==================================================

app.delete(
    "/api/personal-expenses/:id",
    authenticateToken,
    (req, res) => {

        const id =
            req.params.id;

        const userId =
            req.user.id;


        const sql = `

            DELETE FROM personal_expenses

            WHERE id = ?

            AND user_id = ?

        `;


        db.query(

            sql,

            [
                id,
                userId
            ],

            (err, result) => {

                if (err) {

                    console.error(
                        "Delete personal expense error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to delete personal expense",

                        details:
                            err.message

                    });

                }


                if (
                    result.affectedRows === 0
                ) {

                    return res.status(404).json({

                        error:
                            "Personal expense not found"

                    });

                }


                res.json({

                    message:
                        "Personal expense deleted successfully"

                });

            }

        );

    }

);


// ==================================================
// RESET ALL USER DATA
// ==================================================

app.delete(
    "/api/reset",
    authenticateToken,
    (req, res) => {

        const userId =
            req.user.id;


        console.log(
            "Resetting all data for user:",
            userId
        );


        // ----------------------------------------------
        // Delete tour expenses
        // ----------------------------------------------

        const deleteExpenses = `

            DELETE FROM expenses

            WHERE user_id = ?

        `;


        db.query(

            deleteExpenses,

            [userId],

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
                // Delete personal expenses
                // ------------------------------------------

                const deletePersonalExpenses = `

                    DELETE FROM personal_expenses

                    WHERE user_id = ?

                `;


                db.query(

                    deletePersonalExpenses,

                    [userId],

                    (err) => {

                        if (err) {

                            console.error(
                                "Reset personal expenses error:",
                                err.message
                            );

                            return res.status(500).json({

                                error:
                                    "Failed to delete personal expenses"

                            });

                        }


                        // --------------------------------------
                        // Delete tour mates
                        // --------------------------------------

                        const deleteMates = `

                            DELETE FROM tour_mates

                            WHERE user_id = ?

                        `;


                        db.query(

                            deleteMates,

                            [userId],

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
                                    "All user data reset:",
                                    userId
                                );


                                res.json({

                                    message:
                                        "Your tour mates, tour expenses and personal expenses have been deleted successfully"

                                });

                            }

                        );

                    }

                );

            }

        );

    }

);


// ==================================================
// START SERVER
// ==================================================

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