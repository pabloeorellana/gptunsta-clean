import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const passwordToHash = 'profpass123'; 
const saltRounds = 10; 

bcrypt.hash(passwordToHash, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hasheando la contraseña:', err);
        return;
    }
    console.log('ID de Usuario (UUID):', uuidv4());
    console.log('Contraseña Original:', passwordToHash);
    console.log('Password Hash:', hash);
});