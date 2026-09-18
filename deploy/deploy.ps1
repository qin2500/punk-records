param(
  [Parameter(Mandatory = $true)][string]$GithubActor,
  [Parameter(Mandatory = $true)][string]$GithubToken
)

$ErrorActionPreference = 'Stop'

# docker-compose.yml and .env.production are scp'd alongside this script on
# every deploy — no repo checkout needed on this machine at all, the server
# only ever runs pre-built images from GHCR.
Set-Location $PSScriptRoot

echo $GithubToken | docker login ghcr.io -u $GithubActor --password-stdin
docker compose pull
docker logout ghcr.io

docker compose --env-file .env.production up -d

# Runs after `up` so the freshly pulled images are already in use before pruning.
docker image prune -af
