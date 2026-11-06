# FEATURES

Update with every commit. Put a status (in-progress) or (complete) at the end of each line that you work on.

# Test setup and passwords (V0 -> V1)
* 1.1 use curl to get items and post a review without the browser
* 1.2 add a test that a review with no author gets a 422, and see it fail with the server's check removed
* 1.3 db.js exports the database connection, migrate-user.js adds the user table
* 1.4 install argon2
* 1.5 test/user.test.js tests the User model
* 1.6 User model finds users, and signup validates and saves a hashed password
* 1.7 User.login returns the user if the password matches, otherwise null
* 1.8 toJSON leaves out the password hash
* 1.9 seed-admin.js creates the admin account

# Sessions and server routes (V1 -> V2)
* 1.1 temporary /api/visits route to see how cookies work, then send one by hand with curl
* 1.2 replace the cookie demo with express-session, migrate-review.js adds review.user_id
* 1.3 middleware sets req.user on every request, /api/me says who is logged in
* 1.4 /api/register, /api/login, and /api/logout routes
* 1.5 test/auth.test.js tests login, logout, the password hash, and made-up and changed cookies
* 1.6 requireUser: posting a review takes a login and the author comes from the session, tests updated
* 1.7 requireAdmin: only an admin can delete a review (DELETE /api/reviews/:review_id), with a test

# Log in from the SPA (V2 -> V3)
* 2.1 api.js has apiFetch and apiPost, and the items page uses them
* 2.2 root asks /api/me and keeps the user in state, shows Loading until it answers, and has a NavBar with log out
* 2.3 AuthForm with login and register routes
* 2.4 the login sticks after a reload: credentials: 'include' on the client, credentials: true in CORS on the server
* 2.5 post a review as the logged-in user, a logged-out user sees a login link, and a 401 rolls back with a message
* 2.6 delete button on reviews, shown only to admins
