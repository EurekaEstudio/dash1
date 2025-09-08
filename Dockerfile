# ===== Etapa de Construcción =====
# Usa una imagen de Node.js para construir la aplicación
FROM node:20-alpine AS build

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y el lockfile para instalar dependencias
COPY package*.json ./

# Instala las dependencias del proyecto
# Usamos --no-optional y --omit=dev para una instalación limpia en producción
RUN npm install --no-optional --omit=dev && npm cache clean --force

# Copia el resto del código fuente de la aplicación
COPY . .

# Construye la aplicación Vite para producción
# Las variables de entorno VITE_* se deben pasar en este punto
RUN npm run build


# ===== Etapa de Producción =====
# Usa la imagen oficial y ligera de Caddy
FROM caddy:2-alpine

# Establece el directorio de trabajo para los archivos del sitio
WORKDIR /srv

# Copia los archivos construidos desde la etapa de construcción al directorio raíz de Caddy
COPY --from=build /app/dist .

# Copia el Caddyfile para configurar el servidor
COPY Caddyfile /etc/caddy/Caddyfile

# Expone el puerto 80 para HTTP y 443 para HTTPS (Caddy gestiona HTTPS automáticamente)
EXPOSE 80
EXPOSE 443

# El comando por defecto de la imagen de Caddy ya es `caddy run --config /etc/caddy/Caddyfile`
# por lo que no es necesario un CMD o ENTRYPOINT a menos que quieras modificarlo.