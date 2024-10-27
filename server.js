const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/chat-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Modelo de usuario
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Registro de usuario
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    try {
        await user.save();
        res.status(201).send('Usuario registrado');
    } catch (error) {
        res.status(400).send('Error al registrar el usuario');
    }
});

// Inicio de sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(password, user.password))) {
        res.status(200).send('Inicio de sesión exitoso');
    } else {
        res.status(401).send('Credenciales incorrectas');
    }
});

// Manejo de conexiones de Socket.IO
const connectedUsers = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado');

    socket.on('register', (username) => {
        connectedUsers[socket.id] = username;
        io.emit('userList', Object.values(connectedUsers));
    });

    socket.on('disconnect', () => {
        delete connectedUsers[socket.id];
        io.emit('userList', Object.values(connectedUsers));
    });

    socket.on('sendMessage', (message) => {
        io.emit('receiveMessage', message);
    });
});

// Iniciar el servidor
server.listen(3000, () => {
    console.log('Servidor en funcionamiento en http://localhost:3000');
});