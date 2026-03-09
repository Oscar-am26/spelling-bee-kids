$baseDir = "temp_im\speelin"
$targetBase = "assets"

$mapping = @{
    "lista 1" = "science"
    "lista 2" = "content"
    "lista 3" = "certification"
}

foreach ($sourceDir in $mapping.Keys) {
    $targetDir = $mapping[$sourceDir]
    $fullSourcePath = Join-Path $baseDir $sourceDir
    $fullTargetPath = Join-Path $targetBase $targetDir
    
    if (Test-Path $fullSourcePath) {
        Get-ChildItem -Path $fullSourcePath -Filter *.png | ForEach-Object {
            $newName = $_.Name.ToLower().Replace(" ", "_").Trim()
            $destination = Join-Path $fullTargetPath $newName
            Copy-Item -Path $_.FullName -Destination $destination -Force
            Write-Host "Copied: $($_.Name) -> $newName"
        }
    } else {
        Write-Warning "Source path not found: $fullSourcePath"
    }
}
