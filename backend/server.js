const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

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

    password: process.env.MYSQLPASSWORD || "",

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

    const createTourMates = `

        CREATE TABLE IF NOT EXISTS tour_mates (

            id INT AUTO_INCREMENT PRIMARY KEY,

            name VARCHAR(255) NOT NULL

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


        const createExpenses = `

            CREATE TABLE IF NOT EXISTS expenses (

                id INT AUTO_INCREMENT PRIMARY KEY,

                description VARCHAR(255) NOT NULL,

                amount DECIMAL(10,2) NOT NULL,

                payer_id INT NOT NULL,

                FOREIGN KEY (payer_id)
                REFERENCES tour_mates(id)
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
// GET TOUR MATES
// ==================================================

app.get("/api/tourmates", (req, res) => {

    const sql = `

        SELECT *

        FROM tour_mates

        ORDER BY id ASC

    `;


    db.query(sql, (err, results) => {

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

app.post("/api/tourmates", (req, res) => {

    const { name } = req.body;


    if (!name || name.trim() === "") {

        return res.status(400).json({

            error:
                "Name is required"

        });

    }


    const sql = `

        INSERT INTO tour_mates

        (name)

        VALUES (?)

    `;


    db.query(

        sql,

        [name.trim()],

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

app.delete("/api/tourmates/:id", (req, res) => {

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

app.get("/api/expenses", (req, res) => {

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

        ORDER BY expenses.id ASC

    `;


    db.query(

        sql,

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

app.post("/api/expenses", (req, res) => {

    const {

        description,

        amount,

        payerId

    } = req.body;


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

            payer_id

        )

        VALUES (?, ?, ?)

    `;


    db.query(

        sql,

        [

            description.trim(),

            Number(amount),

            Number(payerId)

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

app.delete("/api/expenses/:id", (req, res) => {

    const id = req.params.id;


    console.log(
        "Deleting expense:",
        id
    );


    const sql = `

        DELETE FROM expenses

        WHERE id = ?

    `;


    db.query(

        sql,

        [id],

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

app.delete("/api/reset", (req, res) => {

    console.log(
        "Resetting all data..."
    );


    const deleteExpenses = `

        DELETE FROM expenses

    `;


    db.query(

        deleteExpenses,

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


            const deleteMates = `

                DELETE FROM tour_mates

            `;


            db.query(

                deleteMates,

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
                        "All data deleted!"
                    );


                    res.json({

                        message:
                            "All tour mates and expenses deleted successfully"

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