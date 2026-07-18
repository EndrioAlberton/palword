# Deploy — EC2 (mesma instância do projeto-whey)

Whey já ocupa as portas 8000 (gunicorn) e 3000 (pm2, processo "nextjs") nesse EC2.
PalDeck usa portas separadas para não colidir: **8001** (gunicorn) e **3001** (pm2, processo "paldeck-next").

## Instalar (uma vez, no EC2)

```bash
cd /home/ubuntu
git clone https://github.com/EndrioAlberton/palword.git
cd palword

python3 -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt

cp api/.env.example api/.env
nano api/.env   # ajustar SECRET_KEY, DB_*, ALLOWED_HOSTS=palword.endrioalberton.com.br

python api/manage.py migrate
python api/manage.py collectstatic --noinput
python api/manage.py createsuperuser

cd site && npm install && npm run build && cd ..

# gunicorn via systemd
sudo cp deploy/paldeck-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now paldeck-api

# Next.js via pm2 (porta 3001)
# API_URL e NEXT_PUBLIC_API_URL vêm do site/.env.production (domínio público, via nginx).
# NEXT_PUBLIC_* é embutida no bundle no `npm run build` — mudou a var, precisa rebuildar.
cd site
PORT=3001 pm2 start npm --name "paldeck-next" -- start
pm2 save

# nginx
sudo cp deploy/nginx-paldeck.conf /etc/nginx/sites-available/paldeck
sudo ln -s /etc/nginx/sites-available/paldeck /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS
sudo certbot --nginx -d palword.endrioalberton.com.br
```

## Verificar / operar

```bash
sudo systemctl status paldeck-api
pm2 status
pm2 logs paldeck-next
```

## Deploy contínuo

`.github/workflows/deploy.yml` roda em todo push na `main`: `git pull`, rebuild do Next.js,
`pm2 restart paldeck-next`, migrações + `collectstatic` + `systemctl restart paldeck-api`.

Precisa dos secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` no repositório do GitHub
(os mesmos usados pelo projeto-whey, se for a mesma instância).
