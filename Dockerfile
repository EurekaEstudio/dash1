# ===== Etapa de Construcción =====
# Usa una imagen de Node.js para construir la aplicación
FROM node:20-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y el lockfile para instalar dependencias
COPY package*.json ./

# --- Cache Buster ---
# Esta línea fuerza la invalidación de la caché de Docker para asegurar
# que las dependencias siempre se instalen de nuevo.
ARG CACHE_BUSTER
RUN echo "Busting cache with value: $CACHE_BUSTER"

RUN npm ci

# Copia el resto del código fuente de la aplicación
COPY . .

# Construye la aplicación Vite para producción
RUN npm run build


# ===== Etapa de Producción =====
# Usa la imagen oficial y ligera de Caddy
FROM caddy:2-alpine

# Elimina el Caddyfile por defecto para evitar conflictos
RUN rm /etc/caddy/Caddyfile

# Copia el Caddyfile personalizado
COPY Caddyfile /etc/caddy/Caddyfile

# Copia los archivos construidos desde la etapa de construcción al directorio web raíz de Caddy
COPY --from=builder /app/dist /usr/share/caddy

# Expone el puerto 80 para HTTP y 443 para HTTPS (Caddy gestiona HTTPS automáticamente)
EXPOSE 80
EXPOSE 443

# El comando por defecto de la imagen de Caddy (`caddy run --config /etc/caddy/Caddyfile`) 
# servirá los archivos desde /usr/share/caddy.
