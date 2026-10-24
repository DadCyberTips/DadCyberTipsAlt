/**
 * Shared "system" data for Task Manager and the mock Command Prompt / PowerShell:
 * network identity, running processes, and Windows services. Edit freely.
 */
window.SYS = (() => {
  const h = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const net = { host: 'DESKTOP-SNACK01', user: 'Guest', ip: '192.168.1.42', mask: '255.255.255.0', gw: '192.168.1.1', dns: '192.168.1.1', mac: '00-1A-2B-3C-4D-5E', suffix: 'lan' };

  // image name, pid, session name, memory (KB)
  const procs = [
    ['System Idle Process', 0, 'Services', 8], ['System', 4, 'Services', 144], ['Registry', 108, 'Services', 56320], ['smss.exe', 372, 'Services', 1024],
    ['csrss.exe', 496, 'Services', 5120], ['wininit.exe', 572, 'Services', 6144], ['services.exe', 700, 'Services', 12288], ['lsass.exe', 724, 'Services', 18432],
    ['svchost.exe', 860, 'Services', 24576], ['svchost.exe', 952, 'Services', 17408], ['svchost.exe', 1048, 'Services', 31744], ['dwm.exe', 1188, 'Console', 64512],
    ['spoolsv.exe', 1640, 'Services', 9216], ['MsMpEng.exe', 2216, 'Services', 118784], ['SecurityHealthService.exe', 2540, 'Services', 6144],
    ['SearchIndexer.exe', 3012, 'Services', 26624], ['snacksync.exe', 4242, 'Services', 14336], ['explorer.exe', 4620, 'Console', 96256], ['RuntimeBroker.exe', 5104, 'Console', 12288]
  ];

  // name, display name, pid, running (1/0), start type, binary path (blank = shared svchost)
  const SVC = [
    ['AudioEndpointBuilder', 'Windows Audio Endpoint Builder', 1048, 1, 'AUTO_START'], ['Audiosrv', 'Windows Audio', 1048, 1, 'AUTO_START'],
    ['BFE', 'Base Filtering Engine', 952, 1, 'AUTO_START'], ['BITS', 'Background Intelligent Transfer Service', 0, 0, 'DEMAND_START'],
    ['CryptSvc', 'Cryptographic Services', 1048, 1, 'AUTO_START'], ['Dhcp', 'DHCP Client', 952, 1, 'AUTO_START'], ['Dnscache', 'DNS Client', 952, 1, 'AUTO_START'],
    ['EventLog', 'Windows Event Log', 952, 1, 'AUTO_START'], ['LanmanServer', 'Server', 860, 1, 'AUTO_START'], ['LanmanWorkstation', 'Workstation', 860, 1, 'AUTO_START'],
    ['mpssvc', 'Windows Defender Firewall', 952, 1, 'AUTO_START'], ['Netlogon', 'Netlogon', 0, 0, 'DEMAND_START'], ['nsi', 'Network Store Interface Service', 952, 1, 'AUTO_START'],
    ['PlugPlay', 'Plug and Play', 860, 1, 'DEMAND_START'], ['ProfSvc', 'User Profile Service', 860, 1, 'AUTO_START'], ['RemoteRegistry', 'Remote Registry', 0, 0, 'DISABLED'],
    ['RpcSs', 'Remote Procedure Call (RPC)', 860, 1, 'AUTO_START'], ['SamSs', 'Security Accounts Manager', 724, 1, 'AUTO_START'], ['Schedule', 'Task Scheduler', 1048, 1, 'AUTO_START'],
    ['SecurityHealthService', 'Windows Security Service', 2540, 1, 'DEMAND_START', 'C:\\Windows\\system32\\SecurityHealthService.exe'],
    ['SnackSync', 'SnackSync Background Sync', 4242, 1, 'AUTO_START', 'C:\\ProgramData\\SnackSync\\snacksync.exe -service'],
    ['Spooler', 'Print Spooler', 1640, 1, 'AUTO_START', 'C:\\Windows\\System32\\spoolsv.exe'],
    ['sshd', 'OpenSSH SSH Server', 0, 0, 'DISABLED', 'C:\\Windows\\System32\\OpenSSH\\sshd.exe'],
    ['TermService', 'Remote Desktop Services', 0, 0, 'DEMAND_START'], ['Themes', 'Themes', 1048, 1, 'AUTO_START'],
    ['TrustedInstaller', 'Windows Modules Installer', 0, 0, 'DEMAND_START', 'C:\\Windows\\servicing\\TrustedInstaller.exe'], ['W32Time', 'Windows Time', 0, 0, 'DEMAND_START'],
    ['WinDefend', 'Microsoft Defender Antivirus Service', 2216, 1, 'AUTO_START', '"C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\MsMpEng.exe"'],
    ['Winmgmt', 'Windows Management Instrumentation', 952, 1, 'AUTO_START'], ['wscsvc', 'Security Center', 952, 1, 'AUTO_START'],
    ['WSearch', 'Windows Search', 3012, 1, 'AUTO_START', 'C:\\Windows\\system32\\SearchIndexer.exe /Embedding'], ['wuauserv', 'Windows Update', 0, 0, 'DEMAND_START']
  ];

  // window key -> process image shown while that app is open
  const APPIMG = { notepad: 'notepad.exe', calc: 'CalculatorApp.exe', taskmgr: 'Taskmgr.exe', settings: 'SystemSettings.exe', minesweeper: 'Minesweeper.exe',
    cmd: 'cmd.exe', ps: 'powershell.exe', clock: 'Time.exe', explorer: null };

  const services = () => SVC.map(([name, display, pid, run, start, bin]) => {
    const updating = !!window.updateInProgress && (name === 'wuauserv' || name === 'TrustedInstaller');
    const running = run === 1 || updating;
    return { name, display, pid: updating ? (name === 'wuauserv' ? 860 : 3300) : pid, running, start, bin: bin || 'C:\\Windows\\system32\\svchost.exe -k netsvcs -p' };
  });
  const apps = () => [...windowManager.wins.keys()].filter(k => APPIMG[k]).map(k => ({ key: k, img: APPIMG[k], pid: 5000 + h(k) % 4000, ses: 'Console', mem: 8000 + h(k + 'm') % 90000 }));
  const all = () => {
    const a = procs.map(([img, pid, ses, mem]) => ({ img, pid, ses, mem, sys: true }));
    if (window.updateInProgress) a.push({ img: 'TrustedInstaller.exe', pid: 3300, ses: 'Services', mem: 142000, sys: true });
    return a.concat(apps());
  };
  return { net, procs, services, apps, all, h, APPIMG };
})();
