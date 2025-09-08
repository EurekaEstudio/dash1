# Etapa de construcción
FROM node:20-alpine AS build
WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Eliminar el contenido predeterminado de Nginx
RUN rm -rf ./*

# Copiar los archivos construidos desde la etapa de construcción
COPY --from=build /app/dist .

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
