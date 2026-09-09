
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

    queueLimit: 0,
    dateStrings: true

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
    // USERS
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
        // TRIPS
        // ==================================================

        const createTrips = `

            CREATE TABLE IF NOT EXISTS trips (

                id INT AUTO_INCREMENT PRIMARY KEY,

                name VARCHAR(255) NOT NULL,

                user_id INT NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE

            )

        `;


        db.query(createTrips, (err) => {

            if (err) {

                console.error(
                    "Failed to create trips table:",
                    err.message
                );

                return;
            }

            console.log("trips table ready.");


        // ==================================================
        // TOUR MATES
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


            const addTripIdToMates = `
                ALTER TABLE tour_mates
                ADD COLUMN trip_id INT NULL
            `;

            db.query(addTripIdToMates, (err) => {
                if (err && err.code !== 'ER_DUP_FIELDNAME') {
                    console.error("Failed to add trip_id to tour_mates:", err.message);
                } else {
                    console.log("tour_mates.trip_id ready.");
                }
            });


            // ==================================================
            // TOUR EXPENSES
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

const addDateColumn = `
    ALTER TABLE expenses
    ADD COLUMN expense_date DATE NOT NULL DEFAULT (CURRENT_DATE)
`;

db.query(addDateColumn, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
        console.error("Failed to add expense_date column:", err.message);
    } else {
        console.log("expense_date column ready.");
    }
});

const addTripIdToExpenses = `
    ALTER TABLE expenses
    ADD COLUMN trip_id INT NULL
`;

db.query(addTripIdToExpenses, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
        console.error("Failed to add trip_id to expenses:", err.message);
    } else {
        console.log("expenses.trip_id ready.");
    }
});


                // ==================================================
                // PERSONAL EXPENSES
                // ==================================================

                const createPersonalExpenses = `

                    CREATE TABLE IF NOT EXISTS personal_expenses (

                        id INT AUTO_INCREMENT PRIMARY KEY,

                        user_id INT NOT NULL,

                        description VARCHAR(255) NOT NULL,

                        amount DECIMAL(10,2) NOT NULL,

                        expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),

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

                        const addTripIdToPersonal = `
                            ALTER TABLE personal_expenses
                            ADD COLUMN trip_id INT NULL
                        `;

                        db.query(addTripIdToPersonal, (err) => {
                            if (err && err.code !== 'ER_DUP_FIELDNAME') {
                                console.error("Failed to add trip_id to personal_expenses:", err.message);
                            } else {
                                console.log("personal_expenses.trip_id ready.");
                            }
                        });

                    }
                );

            });

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


            if (results.length > 0) {

                return res.status(409).json({

                    error:
                        "Email already registered"

                });

            }


            try {

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );


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
                                    "Failed to create account",

                                details:
                                    err.message

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
// GET TRIPS (with aggregated mate count + total cost)
// ==================================================

app.get(
    "/api/trips",
    authenticateToken,
    (req, res) => {

        const sql = `

            SELECT

                trips.id,
                trips.name,
                trips.created_at,

                (
                    SELECT COUNT(*)
                    FROM tour_mates
                    WHERE tour_mates.trip_id = trips.id
                ) AS mate_count,

                (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM expenses
                    WHERE expenses.trip_id = trips.id
                ) AS total_cost

            FROM trips

            WHERE trips.user_id = ?

            ORDER BY trips.created_at DESC

        `;

        db.query(sql, [req.user.id], (err, results) => {

            if (err) {
                console.error("Get trips error:", err.message);
                return res.status(500).json({ error: "Failed to get trips", details: err.message });
            }

            res.json(results);

        });

    }
);


// ==================================================
// CREATE TRIP
// ==================================================

app.post(
    "/api/trips",
    authenticateToken,
    (req, res) => {

        const { name } = req.body;
        const userId = req.user.id;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "Trip name is required" });
        }

        const sql = `
            INSERT INTO trips (name, user_id)
            VALUES (?, ?)
        `;

        db.query(sql, [name.trim(), userId], (err, result) => {

            if (err) {
                console.error("Create trip error:", err.message);
                return res.status(500).json({ error: "Failed to create trip", details: err.message });
            }

            res.status(201).json({
                message: "Trip created successfully",
                id: result.insertId,
                name: name.trim()
            });

        });

    }
);


// ==================================================
// DELETE TRIP (also removes its tour mates & expenses)
// ==================================================

app.delete(
    "/api/trips/:id",
    authenticateToken,
    (req, res) => {

        const id = req.params.id;
        const userId = req.user.id;

        const deleteTripExpenses = `
            DELETE FROM expenses
            WHERE trip_id = ? AND user_id = ?
        `;

        db.query(deleteTripExpenses, [id, userId], (err) => {

            if (err) {
                console.error("Delete trip expenses error:", err.message);
                return res.status(500).json({ error: "Failed to delete trip expenses", details: err.message });
            }

            const deleteTripMates = `
                DELETE FROM tour_mates
                WHERE trip_id = ? AND user_id = ?
            `;

            db.query(deleteTripMates, [id, userId], (err) => {

                if (err) {
                    console.error("Delete trip mates error:", err.message);
                    return res.status(500).json({ error: "Failed to delete trip mates", details: err.message });
                }

                const deleteTrip = `
                    DELETE FROM trips
                    WHERE id = ? AND user_id = ?
                `;

                db.query(deleteTrip, [id, userId], (err, result) => {

                    if (err) {
                        console.error("Delete trip error:", err.message);
                        return res.status(500).json({ error: "Failed to delete trip", details: err.message });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: "Trip not found" });
                    }

                    res.json({ message: "Trip deleted successfully" });

                });

            });

        });

    }
);


// ==================================================
// GET TOUR MATES
// ==================================================

app.get(
    "/api/tourmates",
    authenticateToken,
    (req, res) => {

        const tripId = req.query.trip_id;

        if (!tripId) {
            return res.status(400).json({ error: "trip_id is required" });
        }

        const sql = `

            SELECT *

            FROM tour_mates

            WHERE user_id = ?
            AND trip_id = ?

            ORDER BY id ASC

        `;


        db.query(
            sql,
            [req.user.id, tripId],
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

        const { name, trip_id } = req.body;

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


        if (!trip_id) {

            return res.status(400).json({

                error:
                    "trip_id is required"

            });

        }


        const sql = `

            INSERT INTO tour_mates

            (
                name,
                user_id,
                trip_id
            )

            VALUES (?, ?, ?)

        `;


        db.query(

            sql,

            [
                name.trim(),
                userId,
                trip_id
            ],

            (err, result) => {

                if (err) {

                    console.error(
                        "Add tour mate error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to add tour mate",

                        details:
                            err.message

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
                                    "Failed to delete tour mate",

                                details:
                                    err.message

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

        const tripId = req.query.trip_id;

        if (!tripId) {
            return res.status(400).json({ error: "trip_id is required" });
        }

        const sql = `

            SELECT

                expenses.id,

                expenses.description,

                expenses.amount,

                expenses.payer_id,
                expenses.expense_date,

                tour_mates.name AS payer_name

            FROM expenses

            JOIN tour_mates

            ON expenses.payer_id =
               tour_mates.id

            WHERE expenses.user_id = ?
            AND expenses.trip_id = ?

            ORDER BY expenses.id ASC

        `;


        db.query(

            sql,

            [req.user.id, tripId],

            (err, results) => {

                if (err) {

                    console.error(
                        "Get expenses error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to get expenses",

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
// ADD TOUR EXPENSE
// ==================================================

app.post(
    "/api/expenses",
    authenticateToken,
    (req, res) => {

        const {
            description,
            amount,
            payerId,
            expense_date,
            trip_id
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


        if (!trip_id) {

            return res.status(400).json({

                error:
                    "trip_id is required"

            });

        }


        const finalDate =
            expense_date ||
            new Date().toISOString().split("T")[0];


        const checkPayer = `

            SELECT id

            FROM tour_mates

            WHERE id = ?

            AND user_id = ?

            AND trip_id = ?

        `;


        db.query(

            checkPayer,

            [
                payerId,
                userId,
                trip_id
            ],

            (err, results) => {

                if (err) {

                    console.error(
                        "Check payer error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Database error",

                        details:
                            err.message

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
                        user_id,
                        expense_date,
                        trip_id
                    )

                    VALUES (?, ?, ?, ?, ?, ?)

                `;


                db.query(

                    sql,

                    [
                        description.trim(),
                        Number(amount),
                        payerId,
                        userId,
                        finalDate,
                        trip_id
                    ],

                    (err, result) => {

                        if (err) {

                            console.error(
                                "Add expense error:",
                                err.message
                            );

                            return res.status(500).json({

                                error:
                                    "Failed to add expense",

                                details:
                                    err.message

                            });

                        }


                        res.status(201).json({

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
                            "Failed to delete expense",

                        details:
                            err.message

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

        const tripId = req.query.trip_id;

        if (!tripId) {
            return res.status(400).json({ error: "trip_id is required" });
        }

        const sql = `

            SELECT

                id,
                description,
                amount,
                expense_date

            FROM personal_expenses

            WHERE user_id = ?
            AND trip_id = ?

            ORDER BY expense_date DESC, id DESC

        `;


        db.query(

            sql,

            [req.user.id, tripId],

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
            amount,
            expense_date,
            trip_id
        } = req.body;


        const userId =
            req.user.id;


        console.log(
            "Adding personal expense:",
            {
                description,
                amount,
                expense_date,
                trip_id,
                userId
            }
        );


        // ==================================================
        // VALIDATION
        // ==================================================

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


        if (!trip_id) {

            return res.status(400).json({

                error:
                    "trip_id is required"

            });

        }


        // ==================================================
        // DATE
        // If frontend sends date, use it.
        // Otherwise use today's date.
        // ==================================================

        let finalDate;

        if (expense_date) {

            finalDate =
                expense_date;

        }

        else {

            finalDate =
                new Date()
                    .toISOString()
                    .split("T")[0];

        }


        // ==================================================
        // INSERT
        // ==================================================

        const sql = `

            INSERT INTO personal_expenses

            (
                user_id,
                description,
                amount,
                expense_date,
                trip_id
            )

            VALUES (?, ?, ?, ?, ?)

        `;


        db.query(

            sql,

            [
                userId,
                description.trim(),
                Number(amount),
                finalDate,
                trip_id
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

                    user_id:
                        userId,

                    description:
                        description.trim(),

                    amount:
                        Number(amount),

                    expense_date:
                        finalDate

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

        const userId = req.user.id;
        const tripId = req.query.trip_id;

        if (!tripId) {
            return res.status(400).json({ error: "trip_id is required" });
        }

        console.log(
            "Resetting data for trip:",
            tripId,
            "user:",
            userId
        );


        const deleteExpenses = `

            DELETE FROM expenses

            WHERE user_id = ?
            AND trip_id = ?

        `;


        db.query(

            deleteExpenses,

            [userId, tripId],

            (err) => {

                if (err) {

                    console.error(
                        "Reset expenses error:",
                        err.message
                    );

                    return res.status(500).json({

                        error:
                            "Failed to delete expenses",

                        details:
                            err.message

                    });

                }


                const deleteMates = `

                    DELETE FROM tour_mates

                    WHERE user_id = ?
                    AND trip_id = ?

                `;


                db.query(

                    deleteMates,

                    [userId, tripId],

                    (err) => {

                        if (err) {

                            console.error(
                                "Reset mates error:",
                                err.message
                            );

                            return res.status(500).json({

                                error:
                                    "Failed to delete tour mates",

                                details:
                                    err.message

                            });

                        }


                        console.log(
                            "Trip data reset:",
                            tripId
                        );


                        res.json({

                            message:
                                "This trip's tour mates and expenses have been deleted successfully"

                        });

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

