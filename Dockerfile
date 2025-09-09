# Paso 1: Usar una imagen oficial de Nginx, ligera y optimizada
FROM nginx:stable-alpine

# Paso 2: Copiar los archivos del frontend ya construidos
COPY dist/ /usr/share/nginx/html

# Paso 3: Copiar nuestro archivo de configuración personalizado
# Esto reemplazará la configuración por defecto de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Paso 4: Exponer el puerto
EXPOSE 80

# Paso 5: Comando de inicio
CMD ["nginx", "-g", "daemon off;"]