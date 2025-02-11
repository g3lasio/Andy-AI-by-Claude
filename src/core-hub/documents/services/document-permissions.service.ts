import fs from 'fs';
import path from 'path';

interface DocumentPermission {
  document: string;
  user: string;
  permission: 'read' | 'write' | 'admin';
}

export default class DocumentPermissionsService {
  private static instance: DocumentPermissionsService;
  private permissionsFile: string;
  private permissions: DocumentPermission[];

  private constructor() {
    this.permissionsFile = path.join(
      __dirname,
      '../../../storage/permissions.json'
    );
    this.permissions = this.loadPermissions();
  }

  public static getInstance(): DocumentPermissionsService {
    if (!this.instance) {
      this.instance = new DocumentPermissionsService();
    }
    return this.instance;
  }

  /**
   * Carga los permisos desde el archivo JSON.
   */
  private loadPermissions(): DocumentPermission[] {
    if (!fs.existsSync(this.permissionsFile)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(this.permissionsFile, 'utf-8'));
  }

  /**
   * Guarda los permisos en el archivo JSON.
   */
  private savePermissions(): void {
    fs.writeFileSync(
      this.permissionsFile,
      JSON.stringify(this.permissions, null, 2)
    );
  }

  /**
   * Asigna un permiso a un usuario sobre un documento.
   */
  public setPermission(
    document: string,
    user: string,
    permission: 'read' | 'write' | 'admin'
  ): void {
    this.permissions = this.permissions.filter(
      (p) => !(p.document === document && p.user === user)
    );
    this.permissions.push({ document, user, permission });
    this.savePermissions();
  }

  /**
   * Verifica si un usuario tiene un permiso específico sobre un documento.
   */
  public hasPermission(
    document: string,
    user: string,
    requiredPermission: 'read' | 'write' | 'admin'
  ): boolean {
    const userPermission = this.permissions.find(
      (p) => p.document === document && p.user === user
    );
    if (!userPermission) return false;

    const permissionLevels = ['read', 'write', 'admin'];
    return (
      permissionLevels.indexOf(userPermission.permission) >=
      permissionLevels.indexOf(requiredPermission)
    );
  }

  /**
   * Elimina los permisos de un usuario sobre un documento.
   */
  public revokePermission(document: string, user: string): void {
    this.permissions = this.permissions.filter(
      (p) => !(p.document === document && p.user === user)
    );
    this.savePermissions();
  }
}
