CREATE DATABASE IF NOT EXISTS NutriSmart_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE NutriSmart_db;

CREATE TABLE IF NOT EXISTS Users (
    id VARCHAR(50) PRIMARY KEY,
    dni VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    fullName VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(50) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    googleId VARCHAR(255) UNIQUE,
    lastLogin TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('PROFESSIONAL', 'ADMIN'))
);

CREATE TABLE IF NOT EXISTS Professionals (
    userId VARCHAR(50) PRIMARY KEY,
    specialty VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(20) NOT NULL UNIQUE,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    birthDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Appointments (
    id VARCHAR(50) PRIMARY KEY,
    dateTime DATETIME NOT NULL,
    patientId INT,
    professionalUserId VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    reasonForVisit TEXT,
    professionalNotes TEXT,
    patientNotes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (professionalUserId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_appointment_professional_datetime UNIQUE (professionalUserId, dateTime)
);

CREATE TABLE IF NOT EXISTS ProfessionalAvailability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    professionalUserId VARCHAR(50) NOT NULL,
    dayOfWeek INT NOT NULL,
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    slotDurationMinutes INT DEFAULT 30 NOT NULL,
    validFrom DATE,
    validUntil DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (professionalUserId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_avail_dayOfWeek CHECK (dayOfWeek >= 0 AND dayOfWeek <= 6),
    CONSTRAINT chk_avail_endTime_after_startTime CHECK (endTime > startTime),
    CONSTRAINT uq_availability_prof_day_time UNIQUE (professionalUserId, dayOfWeek, startTime)
);

CREATE TABLE IF NOT EXISTS ProfessionalTimeBlocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    professionalUserId VARCHAR(50) NOT NULL,
    startDateTime DATETIME NOT NULL,
    endDateTime DATETIME NOT NULL,
    reason TEXT,
    isAllDay BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (professionalUserId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_block_end_after_start CHECK (endDateTime > startDateTime)
);

CREATE TABLE IF NOT EXISTS ClinicalRecords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patientId INT NOT NULL,
    professionalUserId VARCHAR(50) NOT NULL,
    appointmentId VARCHAR(50) NULL,
    entryDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title VARCHAR(255),
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES Patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (professionalUserId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (appointmentId) REFERENCES Appointments(id) ON DELETE SET NULL ON UPDATE CASCADE
);

SELECT 'NutriSmart_db database and tables created/updated successfully.' AS Status;

SELECT * FROM Patients
SELECT * FROM ProfessionalTimeBlocks

UPDATE Patients
SET createdByProfessionalId = 'e717f22e-cac8-4b0b-8e43-f2dd7023f085'
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12); 

USE NutriSmart_db;
ALTER TABLE Professionals ADD COLUMN description TEXT NULL;

ALTER TABLE Patients ADD COLUMN firstName VARCHAR(100);
ALTER TABLE Patients ADD COLUMN lastName VARCHAR(100);

INSERT INTO Patients (dni, fullName, firstName, lastName, email, phone, birthDate)
VALUES ('12121212C', 'Paciente De Prueba', 'Prueba', 'Paciente', 'prueba@test.com', '555-9999', '1999-12-31');

SELECT * FROM Patients

SELECT id, fullName, role FROM Users WHERE dni = '11223344P';

INSERT INTO Appointments (id, dateTime, patientId, professionalUserId, status)
VALUES (
    'appt_test_01', -- Un ID único para el turno
    '2024-08-10 11:00:00', -- Fecha y hora del turno
    1, -- Reemplaza con el ID del paciente que creaste
    'e717f22e-cac8-4b0b-8e43-f2dd7023f085', -- Reemplaza con el ID de tu usuario profesional logueado
    'SCHEDULED'
);

ALTER TABLE ClinicalRecords
ADD COLUMN pathology VARCHAR(255) NULL;

ALTER TABLE ClinicalRecords
ADD COLUMN attachmentName VARCHAR(255) NULL;

ALTER TABLE Users ADD COLUMN profileImageUrl VARCHAR(255) NULL;

ALTER TABLE Patients
ADD COLUMN createdByProfessionalId VARCHAR(50) NULL,
ADD CONSTRAINT fk_patient_created_by
FOREIGN KEY (createdByProfessionalId) REFERENCES Users(id)
ON DELETE SET NULL; -- Si el profesional se elimina, el paciente no se borra

DESCRIBE Patients;

USE NutriSmart_db;

CREATE TABLE IF NOT EXISTS Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(50) NOT NULL, -- El ID del usuario que recibe la notificación (el profesional)
    message VARCHAR(255) NOT NULL,
    link VARCHAR(255), -- Opcional: un enlace para redirigir al hacer clic (ej. a la agenda)
    isRead BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO Users (id, dni, email, passwordHash, fullName, role, isActive)
VALUES (
    'admin-001-uuid',     -- Puedes usar un ID simple para pruebas o un UUID real
    'admin',              -- DNI
    'adm@nutrismart.com', -- Email
    '$2b$10$TzXfzAuPnUsC6X0Zba1bauD7I1gzj/TIVFCWCyqXt7GAF8eh/Rq1m',       -- <<<--- PEGA AQUÍ EL HASH QUE COPIASTE
    'Administrador', -- Nombre Completo
    'ADMIN',              -- Rol
    TRUE                  -- isActive
);

SELECT * FROM Users;