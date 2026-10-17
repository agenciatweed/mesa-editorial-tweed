"""Credencial SFTP no Gerenciador de Credenciais do Windows, nunca em arquivos/Git."""
import ctypes
from ctypes import wintypes as w
import getpass
TARGET='TweedEditorial/Kinghost'
class CREDENTIAL(ctypes.Structure):
    _fields_=[('Flags',w.DWORD),('Type',w.DWORD),('TargetName',w.LPWSTR),('Comment',w.LPWSTR),('LastWritten',w.FILETIME),('CredentialBlobSize',w.DWORD),('CredentialBlob',ctypes.POINTER(ctypes.c_ubyte)),('Persist',w.DWORD),('AttributeCount',w.DWORD),('Attributes',ctypes.c_void_p),('TargetAlias',w.LPWSTR),('UserName',w.LPWSTR)]
def read():
    pointer=ctypes.POINTER(CREDENTIAL)()
    if not ctypes.windll.advapi32.CredReadW(TARGET,1,0,ctypes.byref(pointer)):
        raise RuntimeError('Credencial SFTP ausente. Execute scripts/credencial_sftp.py configurar no painel local.')
    try:return ctypes.string_at(pointer.contents.CredentialBlob,pointer.contents.CredentialBlobSize).decode('utf-16-le')
    finally:ctypes.windll.advapi32.CredFree(pointer)
def configure():
    secret=getpass.getpass('Senha SFTP (oculta, salva somente no cofre do Windows): ')
    if not secret:raise RuntimeError('Senha vazia.')
    blob=secret.encode('utf-16-le'); buffer=(ctypes.c_ubyte*len(blob)).from_buffer_copy(blob)
    value=CREDENTIAL();value.Type=1;value.TargetName=TARGET;value.UserName='agenciatweed';value.Persist=2;value.CredentialBlobSize=len(blob);value.CredentialBlob=buffer
    if not ctypes.windll.advapi32.CredWriteW(ctypes.byref(value),0):raise ctypes.WinError()
    print('Credencial guardada no cofre do Windows. Nenhuma senha foi escrita no projeto.')
if __name__=='__main__':
    import sys
    if sys.argv[1:] == ['configurar']:configure()
    elif sys.argv[1:] == ['verificar']:
        read();print('Credencial disponível para este usuário do Windows.')
    else:raise SystemExit('Use configurar ou verificar.')
