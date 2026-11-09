<#
.SYNOPSIS
  Deja la base de la demo en su estado conocido: Neo4j encendido y la semilla recién cargada
  (110 nodos, 554 relaciones), que es lo que espera docs/guion-demo.md.

.PARAMETER Ensayo
  Además recorre el guion completo en el navegador (frontend: npm run ensayo) y vuelve a cargar la
  semilla al terminar. Para la víspera de la demo.

.PARAMETER Benchmark
  Además enciende las bases del benchmark, comprueba que tengan 100 000 personas y corre una vez el
  camino en vivo (benchmark: npm run demo) para calentarlas.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\preparar-demo.ps1 -Ensayo -Benchmark
#>
param([switch]$Ensayo, [switch]$Benchmark)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Paso($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }
function Falla($texto) { Write-Host "`nFALLA: $texto" -ForegroundColor Red; exit 1 }

# Un comando externo que escribe en stderr no debe detener el script: solo cuenta su código de salida.
# Su salida va a la pantalla, no al valor de retorno (si no, el código quedaría mezclado con el texto).
function Externo([scriptblock]$comando) {
  $ErrorActionPreference = 'Continue'
  & $comando | Out-Host
  return $LASTEXITCODE
}

function Esperar-Sano($contenedor) {
  $ErrorActionPreference = 'Continue'
  for ($i = 0; $i -lt 60; $i++) {
    $estado = docker inspect -f '{{.State.Health.Status}}' $contenedor 2>$null
    if ($estado -eq 'healthy') { return }
    Start-Sleep -Seconds 3
  }
  Falla "$contenedor no quedó sano en 3 minutos. Revisa: docker compose logs $contenedor"
}

# cypher-shell dentro del contenedor, con la contraseña que el contenedor ya conoce (DB_PASSWORD).
# Sin comillas dobles dentro del argumento: PowerShell 5.1 no las escapa al llamar a un ejecutable.
function Cypher($argumentos) {
  docker compose exec -T neo4j sh -c "cypher-shell -u neo4j -p `$DB_PASSWORD $argumentos"
}

function Cargar-Semilla {
  foreach ($archivo in '00_limpiar', '01_esquema', '02_datos_semilla') {
    Write-Host "  $archivo.cypher"
    $codigo = Externo { Cypher "-f /scripts/$archivo.cypher" | Out-Null }
    if ($codigo -ne 0) { Falla "no se pudo cargar $archivo.cypher" }
  }
  $conteo = (Cypher "--format plain 'MATCH (n) WITH count(n) AS nodos MATCH ()-[r]->() RETURN nodos, count(r) AS relaciones'" | Select-Object -Last 1).Trim()
  if ($conteo -ne '110, 554') { Falla "la base quedó con $conteo (nodos, relaciones); se esperaba 110, 554" }
  Write-Host "  110 nodos y 554 relaciones" -ForegroundColor Green
}

Paso 'Docker'
if ((Externo { docker info *> $null }) -ne 0) {
  Falla 'Docker no responde. Abre Docker Desktop y espera a que diga "Engine running". Si se cierra con un error de dockerInference, mira la tabla "Si algo falla" de docs/guion-demo.md.'
}
Externo { docker compose up -d } | Out-Null
Esperar-Sano 'red-profesional-neo4j'
Write-Host '  Neo4j sano' -ForegroundColor Green

Paso 'Semilla'
Cargar-Semilla

if ($Ensayo) {
  Paso 'Ensayo del guion en el navegador'
  Push-Location frontend
  $codigo = Externo { npm run ensayo }
  Pop-Location
  if ($codigo -ne 0) { Falla 'el ensayo no pasó. El reporte: cd frontend; npx playwright show-report' }
  Paso 'Semilla otra vez, para que la demo arranque limpia'
  Cargar-Semilla
}

if ($Benchmark) {
  Paso 'Bases del benchmark'
  Externo { docker compose --profile benchmark up -d } | Out-Null
  Esperar-Sano 'red-profesional-neo4j-bench'
  Esperar-Sano 'red-profesional-postgres-bench'
  $personas = (docker exec red-profesional-postgres-bench psql -U postgres -d red -tAc 'select count(*) from usuarios').Trim()
  if ($personas -ne '100000') {
    Falla "PostgreSQL del benchmark tiene $personas personas. Carga las 100 000: cd benchmark; npm run generar -- 100000; npm run cargar -- 100000"
  }
  Push-Location benchmark
  $codigo = Externo { npm run demo }
  Pop-Location
  if ($codigo -ne 0) { Falla 'el camino en vivo falló (benchmark: npm run demo)' }
}

Paso 'Aplicación'
$arriba = $true
foreach ($url in 'http://localhost:3000/salud', 'http://localhost:5173') {
  try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null } catch { $arriba = $false }
}
if ($arriba) {
  Write-Host '  Backend y frontend encendidos' -ForegroundColor Green
} else {
  Write-Host '  Falta encender la app, cada una en su terminal:' -ForegroundColor Yellow
  Write-Host '    cd backend; npm run dev'
  Write-Host '    cd frontend; npm run dev'
}
Write-Host "`nListo para la demo: docs/guion-demo.md" -ForegroundColor Green
