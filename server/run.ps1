$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "Missing server\.env. Copy server\.env.example to server\.env and add your MongoDB URI."
    exit 1
}

$mongoUri = $null
foreach ($line in Get-Content $envFile) {
    $entry = $line.Trim()
    if (-not $entry -or $entry.StartsWith('#')) {
        continue
    }

    $separator = $entry.IndexOf('=')
    if ($separator -lt 1 -or $entry.Substring(0, $separator).Trim() -ne 'MONGODB_URI') {
        continue
    }

    $mongoUri = $entry.Substring($separator + 1).Trim()
    if ($mongoUri.Length -ge 2 -and (($mongoUri.StartsWith('"') -and $mongoUri.EndsWith('"')) -or ($mongoUri.StartsWith("'") -and $mongoUri.EndsWith("'")))) {
        $mongoUri = $mongoUri.Substring(1, $mongoUri.Length - 2)
    }
    break
}

if ([string]::IsNullOrWhiteSpace($mongoUri) -or $mongoUri -match '<[^>]+>' -or $mongoUri -notmatch '^mongodb(\+srv)?://') {
    Write-Error "MONGODB_URI in server\.env is missing or still contains the example value. Add a valid MongoDB URI."
    exit 1
}

$jarPath = Join-Path $PSScriptRoot 'target\marketplace-0.0.1-SNAPSHOT.jar'
$maven = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $maven -and -not (Test-Path $jarPath)) {
    Write-Error 'Maven is not installed and the prebuilt server JAR was not found.'
    exit 1
}

$previousMongoUri = $env:MONGODB_URI
$previousSpringMongoUri = $env:SPRING_DATA_MONGODB_URI
$exitCode = 0
Push-Location $PSScriptRoot
try {
    $env:MONGODB_URI = $mongoUri
    $env:SPRING_DATA_MONGODB_URI = $mongoUri
    if ($maven) {
        & mvn spring-boot:run
    } else {
        & java -jar '.\target\marketplace-0.0.1-SNAPSHOT.jar'
    }
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
    $env:MONGODB_URI = $previousMongoUri
    $env:SPRING_DATA_MONGODB_URI = $previousSpringMongoUri
}

if ($exitCode -ne 0) {
    exit $exitCode
}
