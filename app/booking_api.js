//imported libraries
const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const api_key = '26c24768-9de2-4787-a282-0e45fd498c9e';
const cors = require("cors");
app.use(cors({ origin: ["http://localhost:8100", "http://localhost"] }));

connect_to_database = () => {
    return new sqlite3.Database('/Users/kenjar/www/service-booking-api/info.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) console.log('open error', err.message);
        else console.log('Database connection successful.');
    });
}

format_date = (date_time) => {
    return new Date(date_time).toLocaleDateString('en-us', {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

is_equal = (date_from_api, date_from_db) => {
    return date_from_api.valueOf() == date_from_db.valueOf();
}

// sign in api (testing)
app.get('/api/sign-in', (req, res) => {
    const db = connect_to_database();
    const sql = `SELECT * from Users
    WHERE email='${req.query.email}' AND password='${ req.query.password }'
    ORDER BY first_name`;

    if (req.query.email && req.query.password && api_key) {
        db.all(sql, [], (err, rows) => {
            if (err) {
                res.send(err.message);
            } else if (rows && rows.length) {
                res.send({
                    success: true,
                    user: rows[0],
                    message: 'Login succesful.'
                });
            } else {
                res.send({
                    success: false,
                    message: 'Login failed. Check your username and password.'
                });
            }
        });
    } else {
        res.sendStatus(401);
    }

    db.close();
});
// user signup api (testing)
app.post('/api/user-signup', (req, res) => {
    const db = connect_to_database();
    const select_sql = `SELECT * from Users
    WHERE Users.email=${ req.query.email }`;
    var insert_sql = `INSERT INTO Users (first_name, last_name, address, city, state, country, email, phone_number, additional_info, is_admin, password)
    VALUES ('${ req.query.first_name }', '${ req.query.last_name }', '${ req.query.address }', '${ req.query.city }','${ req.query.state }', '${ req.query.country }', '${ req.query.email }', '${ req.query.phone_number }', '${ req.query.additional_info}', ${ req.query.is_admin}, '${ req.query.password}');`;

    db.all(select_sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
        } else if (rows.length > 0) {
            return res.send({
                success: false,
                'message': 'An account with this email address already exists'
            });
        }
    });

    if (api_key) {
        db.run(insert_sql, [], (err) => {
            if (err) {
                res.send(err.message);
            } else {
                res.send({
                    success: true,
                    'message': 'You have signed up successfully.',
                    user: req.query
                });
            }
        });
    } else {
        res.sendStatus(401);
    }
    db.close();
});
// view user bookings api (testing)
app.get('/api/get-user-bookings', (req, res) => {
    const db = connect_to_database();
    const sql = `SELECT * from Bookings
    WHERE user_id='${req.query.user_id}'
    ORDER BY date`;

    if (api_key && req.query.user_id) {
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.log(err.message);
            } else {
                res.send({
                    success: true,
                    bookings: rows
                });
            }
        });
    } else {
        res.sendStatus(401);
    }
    db.close();
});
// book service api (testing)
app.post('/api/user-book-service', (req, res) => {
    const db = connect_to_database();
    const select_sql = `SELECT * from Bookings
    WHERE user_id='${req.query.user_id}'
    ORDER BY date`;
    const date_from_api = format_date(`${ req.query.date } ${ req.query.time }`);
    const insert_sql = `INSERT INTO Bookings (user_id, time, date, more_info, location, service, is_consultation, residence_type)
    VALUES (${ req.query.user_id },'${ req.query.time }','${ req.query.date }','${ req.query.more_info }','${ req.query.location }','${ req.query.service }','${ req.query.is_consultation }', '${ req.query.residence_type }');`;
    var user_has_consultation = false;
    var user_has_booking_at_selected_time = false;
    //check if booking exists at this date-time
    db.all(select_sql, [], (err, rows) => {
        if (err) {
            console.error(err);
        } else if (rows) {
            for (const booking of rows) {
                if (parseInt(booking.is_consultation) === 1) {
                    user_has_consultation = true;
                }
                if (is_equal(date_from_api, format_date(`${ booking.date } ${ booking.time }`)) && booking.is_past_booking != 1) {
                    if (!user_has_booking_at_selected_time) {
                        user_has_booking_at_selected_time = true;
                    }
                }
            }
        }
        if(parseInt(req.query.is_consultation) === 1) {
            user_has_consultation = true;
        }
        if (!user_has_consultation) {
            res.send({
                success: false,
                'message': 'You need to book a consultation in order to book an appointment.'
            });
            return;
        }
        if (user_has_booking_at_selected_time) {
            res.send({
                success: false,
                'message': 'You already have a booking at the selected time.'
            });
            return;
        }
        if (api_key && req.query.user_id) {
            db.run(insert_sql, [], (err) => {
                if (err) {
                    console.log(err.message);
                } else {
                    db.all(select_sql, [], (err, rows) => {
                        if (err) {
                            console.error(err);
                        } else if (rows) {
                            res.send({
                                success: true,
                                'message': 'Booking has been made successfully',
                                bookings: rows,
                                booking_data: req.query
                            });
                        }
                    });
                }
            });
        } else {
            res.sendStatus(401);
        }
    });

    db.close();
});
// edit booking api (testing)
app.post('/api/edit-user-booking', (req, res) => {
    const db = connect_to_database();
    const update_sql = `UPDATE Bookings
    SET time = '${ req.query.time }', date = '${ req.query.date }', more_info = '${ req.query.more_info }', location = '${ req.query.location }', service = '${ req.query.service }', is_consultation = ${ req.query.is_consultation }
    WHERE booking_id=${ req.query.booking_id };`

    if (api_key && req.query.booking_id) {
        db.run(update_sql, [], (err) => {
            if (err) {
                console.log(err.message);
            } else {
                res.send({
                    success: true,
                    'message': 'You have updated your booking successfully',
                    user: req.query
                });
            }
        });
    } else {
        res.sendStatus(401);
    }
});
// cancel booking api (testing)
app.post('/api/cancel-user-booking', (req, res) => {
    let db = null;
    db = connect_to_database();
    const cancel_sql = `UPDATE Bookings
    SET is_past_booking = '1'
    WHERE booking_id=${ req.query.booking_id };`
    const select_sql = `SELECT * from Bookings
    WHERE booking_id='${req.query.booking_id}'`;

    if (req.query.booking_id) {
        db.all(select_sql, [], (err, rows) => {
            if (err) {
                console.log(err.message);
            } else if (rows.length > 0) {
                console.log({
                    success: true,
                    'message': 'Booking exists',
                    booking_to_cancel: rows[0]
                });
                db.run(cancel_sql, [], (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        db.all(select_sql, [], (err, rows) => {
                            if(err) {
                                console.log(err);
                            } else {
                                res.send({
                                    success: true,
                                    'message': req.query.success_message,
                                    cancelled_booking: rows[0]
                                }); 
                            }
                        });
                    }
                });
            } else {
                res.send({
                    success: false,
                    'message': 'Booking does not exist'
                });
            }
        });
    } else {
        res.sendStatus(400);
    }
    db.close();
});
// cancel booking api (testing)
app.post('/api/edit-user-profile', async (req, res) => {
    let db = connect_to_database();
    const select_user_sql = `SELECT * from Users
    WHERE Users.user_id=${req.query.user_id}`;
    const update_sql = `UPDATE Users
    SET first_name='${ req.query.first_name }', last_name='${ req.query.last_name }', address='${ req.query.address }', city='${ req.query.city }', state='${ req.query.state }', country='${ req.query.country }', email='${ req.query.email }', phone_number='${ req.query.phone_number }', additional_info='${ req.query.additional_info }', is_admin='${ req.query.is_admin }'
    WHERE user_id=${ req.query.user_id };`
    var user_found = false;
    if (api_key) {
        await db.all(select_user_sql, [], (err, rows) => {
            if (err) {
                console.error(err.message);
            } else if (!rows.length) {
                user_found = false;
            } else if (rows.length) {
                user_found = true;
            }
            if (user_found) {
                db.run(update_sql, [], (err) => {
                    if (err) {
                        console.log(err.message);
                    } else {
                        res.send({
                            success: true,
                            message: 'Profile updated successfully.',
                            updated_user: res.query
                        });
                    }
                });
            } else {
                res.send('User not found');
            }
        });
    } else {
        res.sendStatus(400);
    }
    db.close();
});
app.get('/api/get-service-types', async (req, res) => {
    let db = connect_to_database();
    const select_sql = `SELECT * from Services
    WHERE domain_id=${req.query.domain_id}`;
    if(req.query.domain_id) {
        db.all(select_sql, [], (err, rows) => {
            if (err) {
                console.log(err.message);
            } else if (rows.length > 0) {
                res.send({
                    success: true,
                    services: rows
                });
            }
        });
    } else {
        res.sendStatus(400);
    }
    db.close();
});
// user apis end //
app.listen(80);
