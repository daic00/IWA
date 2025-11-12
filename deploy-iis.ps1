# IWA Conference IIS 部署脚本
# 需要以管理员权限运行

param(
    [string]$SiteName = "IWA Conference",
    [string]$SitePath = $PSScriptRoot,
    [int]$Port = 80,
    [string]$AppPoolName = "IWAConferenceAppPool"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IWA Conference IIS 部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误: 此脚本需要管理员权限运行！" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell，选择'以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

# 检查 Node.js
Write-Host "[1/6] 检查 Node.js 安装..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js 未安装！请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查 iisnode
Write-Host "[2/6] 检查 iisnode 模块..." -ForegroundColor Yellow
$iisnodePath = "C:\Program Files\iisnode"
if (Test-Path $iisnodePath) {
    Write-Host "✓ iisnode 已安装" -ForegroundColor Green
} else {
    Write-Host "✗ iisnode 未安装！" -ForegroundColor Red
    Write-Host "  请从 https://github.com/Azure/iisnode/releases 下载并安装 iisnode" -ForegroundColor Yellow
    exit 1
}

# 检查 IIS
Write-Host "[3/6] 检查 IIS..." -ForegroundColor Yellow
try {
    Import-Module WebAdministration -ErrorAction Stop
    Write-Host "✓ IIS 已安装" -ForegroundColor Green
} catch {
    Write-Host "✗ IIS 未安装或 WebAdministration 模块不可用" -ForegroundColor Red
    exit 1
}

# 安装项目依赖
Write-Host "[4/6] 安装项目依赖..." -ForegroundColor Yellow
$serverPath = Join-Path $SitePath "server"
if (Test-Path $serverPath) {
    Push-Location $serverPath
    try {
        npm install --production
        Write-Host "✓ 依赖安装完成" -ForegroundColor Green
    } catch {
        Write-Host "✗ 依赖安装失败" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    Write-Host "✗ 找不到 server 目录" -ForegroundColor Red
    exit 1
}

# 创建应用程序池
Write-Host "[5/6] 配置 IIS 应用程序池和网站..." -ForegroundColor Yellow

# 检查应用程序池是否存在
if (Test-Path "IIS:\AppPools\$AppPoolName") {
    Write-Host "  应用程序池 '$AppPoolName' 已存在，将使用现有配置" -ForegroundColor Yellow
} else {
    New-WebAppPool -Name $AppPoolName
    Write-Host "  ✓ 创建应用程序池: $AppPoolName" -ForegroundColor Green
}

# 配置应用程序池
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name enable32BitAppOnWin64 -Value $false
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.idleTimeout -Value ([TimeSpan]::FromMinutes(0))
Write-Host "  ✓ 应用程序池配置完成" -ForegroundColor Green

# 检查网站是否存在
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Write-Host "  网站 '$SiteName' 已存在，将更新配置" -ForegroundColor Yellow
    Remove-Website -Name $SiteName
}

# 创建网站
New-Website -Name $SiteName `
    -Port $Port `
    -PhysicalPath $SitePath `
    -ApplicationPool $AppPoolName

Write-Host "  ✓ 创建网站: $SiteName (端口: $Port)" -ForegroundColor Green

# 设置文件夹权限
Write-Host "[6/6] 设置文件夹权限..." -ForegroundColor Yellow

$accounts = @(
    "IIS_IUSRS",
    "IUSR",
    "IIS AppPool\$AppPoolName"
)

$folders = @(
    $SitePath,
    (Join-Path $SitePath "server\database"),
    (Join-Path $SitePath "server\uploads")
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        foreach ($account in $accounts) {
            try {
                $acl = Get-Acl $folder
                $permission = $account, "Modify", "ContainerInherit,ObjectInherit", "None", "Allow"
                $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
                $acl.SetAccessRule($accessRule)
                Set-Acl $folder $acl
            } catch {
                Write-Host "  警告: 无法为 $account 设置 $folder 的权限" -ForegroundColor Yellow
            }
        }
    }
}
Write-Host "  ✓ 权限设置完成" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "网站信息:" -ForegroundColor Yellow
Write-Host "  名称: $SiteName" -ForegroundColor White
Write-Host "  路径: $SitePath" -ForegroundColor White
Write-Host "  端口: $Port" -ForegroundColor White
Write-Host "  访问地址: http://localhost:$Port" -ForegroundColor White
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 确保已初始化数据库: cd server && npm run init-db" -ForegroundColor White
Write-Host "  2. 在 IIS 管理器中启动网站" -ForegroundColor White
Write-Host "  3. 访问 http://localhost:$Port 测试" -ForegroundColor White
Write-Host "  4. 查看日志: $SitePath\iisnode\" -ForegroundColor White
Write-Host ""

