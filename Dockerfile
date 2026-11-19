# Lavica je čistý statický web – žiadny build, len nginx, ktorý servíruje súbory.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
EXPOSE 80
