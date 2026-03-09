$baseDir = "assets"
$subdirs = "science", "content", "certification"

foreach ($subdir in $subdirs) {
    $path = Join-Path $baseDir $subdir
    if (Test-Path $path) {
        $files = Get-ChildItem -Path $path -Filter *.png
        foreach ($file in $files) {
            $newName = $file.Name.ToLower().Replace(" ", "_").Replace("__", "_").Trim("_")
            $destination = Join-Path $path $newName
            
            # Simple check by name to avoid issues with Get-Item if file doesn't exist yet
            if ($file.Name -ne $newName) {
                if (Test-Path $destination) {
                    # If target exists, just remove the old one if it's the same (case insensitive FS)
                    # or force overwrite if it's actually different
                    Remove-Item -Path $file.FullName -Force
                } else {
                    Rename-Item -Path $file.FullName -NewName $newName -Force
                }
                Write-Host "Processed: $($file.Name) -> $newName"
            }
        }
    }
}
