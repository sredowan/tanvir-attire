Add-Type -AssemblyName System.Drawing

$uploadsDir = Join-Path (Get-Location) "uploads"
$files = Get-ChildItem -Path $uploadsDir -Include *.jpg, *.jpeg, *.png -File -Recurse

Write-Host "Starting smart image compression..."
Write-Host "Uploads directory: $uploadsDir"

# Get JPEG Encoder info
$codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders()
$jpegCodec = $null
foreach ($codec in $codecs) {
    if ($codec.FormatDescription -eq "JPEG") {
        $jpegCodec = $codec
        break
    }
}

if ($null -eq $jpegCodec) {
    Write-Error "JPEG Codec not found"
    exit 1
}

$encoder = [System.Drawing.Imaging.Encoder]::Quality

$totalOldSize = 0
$totalNewSize = 0
$count = 0

foreach ($file in $files) {
    $filePath = $file.FullName
    $oldSize = $file.Length
    $totalOldSize += $oldSize
    
    # Check if this is the primary image/thumbnail (ends with _1)
    $isPrimary = $file.Name -match "_1\.(jpg|jpeg|png)$"
    
    # Skip files that are already very small unless they are primary and we need to ensure high quality from original
    # Note: we will be copying fresh high-res originals first, so we want to compress everything.
    
    if ($isPrimary) {
        $maxWidth = 1600.0
        $maxHeight = 2400.0
        $quality = 88
        Write-Host "Compressing primary image $($file.Name) with high quality (Quality: 88%, Max Width: 1600px)..."
    } else {
        $maxWidth = 1000.0
        $maxHeight = 1500.0
        $quality = 70
        Write-Host "Compressing gallery image $($file.Name) with standard quality (Quality: 70%, Max Width: 1000px)..."
    }
    
    # Setup quality parameter
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, $quality)
    
    try {
        # Load image
        $img = [System.Drawing.Image]::FromFile($filePath)
        
        $width = $img.Width
        $height = $img.Height
        
        $scale = 1.0
        if ($width -gt $maxWidth -or $height -gt $maxHeight) {
            $scaleW = $maxWidth / $width
            $scaleH = $maxHeight / $height
            $scale = [Math]::Min($scaleW, $scaleH)
        }
        
        $newWidth = [int]($width * $scale)
        $newHeight = [int]($height * $scale)
        
        # Create new Bitmap
        $bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        # Set high quality render settings
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw resized image
        $rect = New-Object System.Drawing.Rectangle(0, 0, $newWidth, $newHeight)
        $g.DrawImage($img, $rect)
        
        # Save to temp path
        $tempPath = "$filePath.tmp"
        $bmp.Save($tempPath, $jpegCodec, $encoderParams)
        
        # Clean up handles
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
        
        # Replace original with temp
        Remove-Item $filePath -Force
        Rename-Item $tempPath -NewName $file.Name -Force
        
        # Get new size
        $newFile = Get-Item $filePath
        $newSize = $newFile.Length
        $totalNewSize += $newSize
        $count++
        
        $reduction = [Math]::Round((($oldSize - $newSize) / $oldSize) * 100, 2)
        Write-Host "-> Saved: $([Math]::Round($newSize/1KB, 2)) KB (Reduced by $reduction%)"
    } catch {
        Write-Host "-> Error processing $($file.Name): $_"
        $totalNewSize += $oldSize
    }
}

Write-Host "-------------------------------------------"
Write-Host "Smart compression completed!"
Write-Host "Processed $count files."
Write-Host "Total original size: $([Math]::Round($totalOldSize/1MB, 2)) MB"
Write-Host "Total optimized size: $([Math]::Round($totalNewSize/1MB, 2)) MB"
Write-Host "Total reduction: $([Math]::Round((($totalOldSize - $totalNewSize) / $totalOldSize) * 100, 2))%"
