# College Appointment System

This is a simple **College Appointment System** built using **Node.js**, **Express**, and **SQLite**. It allows students to book appointments with professors based on their availability.

## Features
- User registration and authentication (students and professors)
- Professors can set their availability slots
- Students can book appointments based on available slots
- Students can view their booked appointments
- Appointments can be canceled

## Tech Stack
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT (JSON Web Token)
- **Security**: Password hashing with bcrypt

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/SalaamNkinda/College-Appointment-System.git
   cd College-Appointment-System
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file and add the following:
   ```sh
   JWT_SECRET=your_secret_key
   PORT=3000
   ```
4. Start the server:
   ```sh
   node server.js
   ```
5. The server will run on `http://localhost:3000`

## API Endpoints
### Authentication
- **Register**: `POST /register`
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "student" // or "professor"
  }
  ```
- **Login**: `POST /login`
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
  Response:
  ```json
  {
    "token": "your_jwt_token"
  }
  ```

### Availability (Professors Only)
- **Add availability**: `POST /availability`
  ```json
  {
    "start_time": "2024-03-15T09:00:00",
    "end_time": "2024-03-15T10:00:00"
  }
  ```
- **Get professor availability**: `GET /availability/:professorId`

### Appointments (Students Only)
- **Book an appointment**: `POST /appointments`
  ```json
  {
    "professor_id": 1,
    "slot_id": 2
  }
  ```
- **View student appointments**: `GET /appointments`
- **Cancel an appointment**: `DELETE /appointments/:id`

## Notes
- JWT token must be included in the `Authorization` header for protected routes.
  ```sh
  Authorization: Bearer your_jwt_token
  ```

## License
This project is open-source and available under the MIT License.

