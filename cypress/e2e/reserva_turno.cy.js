describe('Flujo de Reserva de Turno para Pacientes', () => {
  it('Un paciente puede reservar un turno exitosamente', () => {
    // 1. Visitar la Landing Page (asumiendo que corre en el puerto 5173)
    cy.visit('http://localhost:5173/');

    // 2. Hacer clic en el botón para solicitar un turno
    cy.contains('Solicitar Turno').click();

    // 3. Aceptar el modal de bienvenida
    cy.contains('Acepto, Continuar').click();

    // 4. Seleccionar el primer profesional disponible
    // Usamos .first() para que la prueba no dependa de un nombre específico
    cy.contains('Seleccionar Profesional').first().click();

    // 5. Seleccionar un horario disponible (ej. 09:15)
    // Asegúrate de que este horario esté realmente disponible al correr la prueba
    cy.contains('19:30').click();

    // 6. Rellenar el formulario del paciente
    cy.get('input[name="dni"]').type('98765432'); // Un DNI de prueba
    cy.get('input[name="firstName"]').type('Ana');
    cy.get('input[name="lastName"]').type('Prueba');
    cy.get('input[name="email"]').type('ana.prueba@email.com');

    // 7. Confirmar el turno
    cy.contains('Confirmar Turno').click();

    // 8. **Verificación final (Assertion)**: Comprobar que se muestra la confirmación
    cy.contains('Turno Confirmado!').should('be.visible');
  });
});