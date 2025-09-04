FROM nginx:stable-alpine

# Paso 2: Copiar los archivos del frontend ya construidos
# Copia el contenido de tu carpeta 'dist' local a la carpeta
# donde Nginx sirve los archivos por defecto dentro del contenedor.
COPY dist/ /usr/share/nginx/html

# Paso 3: Exponer el puerto
# Informa a Docker que el contenedor escuchará en el puerto 80
EXPOSE 80

# Paso 4: Comando de inicio
# La imagen de Nginx se inicia automáticamente, pero es una buena práctica
# incluir el comando
CMD ["nginx", "-g", "daemon off;"]
