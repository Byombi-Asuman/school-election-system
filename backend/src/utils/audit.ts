import { AuditAction } from '@prisma/client';
import prisma from './prisma';
import { Request } from 'express';

interface AuditOptions {
  userId?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  details?: object;
  req?: Request;
}

export const createAuditLog = async (options: AuditOptions) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        details: options.details as any,
        ipAddress: options.req?.ip,
        userAgent: options.req?.get('user-agent'),
      },
    });
  } catch (error) {
    // Audit logging should not fail silently but not crash the app
    console.error('Audit log error:', error);
  }
};
