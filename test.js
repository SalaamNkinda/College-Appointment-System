//We import the testing library (supertest) and (./server) which we exported earlier
const request = require('supertest');
const { app, server, closeDatabase } = require('./server');

//describe the entire test for the system, with variables
describe('College Appointment System', () => {
    let studentToken, professorToken, studentToken2, professorId, slotId, appointmentId, appointmentId2;

    it('registers student A1', async () => {
        const res = await request(app)
            .post('/register')
            .send({ email: 'student1@gmail.com', password: 'password', role: 'student' });
        expect(res.status).toBe(200);
    });

    it('registers professor A1', async () => {
        const res = await request(app)
            .post('/register')
            .send({ email: 'professor1@gmail.com', password: 'password', role: 'professor' });
        expect(res.status).toBe(200);
        professorId = res.body.id;
    });

    it('logs in student A1', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: 'student1@gmail.com', password: 'password' });
        expect(res.status).toBe(200);
        studentToken = res.body.token;
    });

    it('logs in professor P1', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: 'professor1@gmail.com', password: 'password' });
        expect(res.status).toBe(200);
        professorToken = res.body.token;
    });

    it('adds availability for professor P1', async () => {
        const res = await request(app)
            .post('/availability')
            .set('Authorization', `Bearer ${professorToken}`)
            .send({ start_time: '2025-03-16T10:00:00', end_time: '2025-03-16T11:00:00' });
        expect(res.status).toBe(200);
        slotId = res.body.id;
    });

    it('books appointment for student A1', async () => {
        const res = await request(app)
            .post('/appointments')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ professor_id: professorId, slot_id: slotId });
        expect(res.status).toBe(200);
        appointmentId = res.body.id;
    });

    it('registers student A2', async () => {
        const res = await request(app)
            .post('/register')
            .send({ email: 'student2@example.com', password: 'password', role: 'student' });
        expect(res.status).toBe(200);
    });

    it('logs in student A2', async () => {
        const res = await request(app)
            .post('/login')
            .send({ email: 'student2@example.com', password: 'password' });
        expect(res.status).toBe(200);
        studentToken2 = res.body.token;
    });

    it('books appointment for student A2', async () => {
        // Add a new availability slot for the professor
        const resAvailability = await request(app)
            .post('/availability')
            .set('Authorization', `Bearer ${professorToken}`)
            .send({ start_time: '2025-03-16T11:00:00', end_time: '2025-03-16T12:00:00' });
        
        const newSlotId = resAvailability.body.id;
    
        // Book the new slot for student A2
        const res = await request(app)
            .post('/appointments')
            .set('Authorization', `Bearer ${studentToken2}`)
            .send({ professor_id: professorId, slot_id: newSlotId });
        
        expect(res.status).toBe(200);
        appointmentId2 = res.body.id;
    });

    it('cancels appointment by professor P1', async () => {
        const res = await request(app)
            .delete(`/appointments/${appointmentId}`)
            .set('Authorization', `Bearer ${professorToken}`);
        expect(res.status).toBe(200);
    });

    it('checks appointments for student A1', async () => {
        const res = await request(app)
            .get('/appointments')
            .set('Authorization', `Bearer ${studentToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]); // Expect no appointments after cancellation
    });
});

// Close server and database connection after tests
afterAll(async () => {
    await new Promise((resolve, reject) => {
        closeDatabase();
        server.close(() => {
            resolve();
        });
    });
});

