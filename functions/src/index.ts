import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const DEMO_DELIVERY_OTP = '8421';

const transitions: Record<string, string[]> = {
  ACCEPTED: ['PENDING'],
  PAID: ['ACCEPTED'],
  RIDER_LEFT: ['PAID'],
  AT_SHOP: ['RIDER_LEFT', 'ACCEPTED'],
  ITEM_PURCHASED: ['AT_SHOP'],
  PHOTO_APPROVED: ['ITEM_PURCHASED'],
  DELIVERING: ['PHOTO_APPROVED', 'ITEM_PURCHASED'],
  ARRIVED: ['DELIVERING'],
  DELIVERED: ['ARRIVED'],
};

const transitionExtraKeys: Record<string, string[]> = {
  PAID: [],
  RIDER_LEFT: [],
  AT_SHOP: [],
  ITEM_PURCHASED: ['actualPrice', 'purchasedPhotoUrls'],
  PHOTO_APPROVED: [],
  DELIVERING: [],
  ARRIVED: [],
  CANCELLED: ['cancelReason', 'cancelledBy'],
};

function requireAuth(request: { auth?: { uid: string } | null }): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  return request.auth.uid;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${name} is required.`);
  }
  return value.trim();
}

function requireOrderParticipant(order: FirebaseFirestore.DocumentData, uid: string): void {
  if (order.clientId !== uid && order.riderId !== uid) {
    throw new HttpsError('permission-denied', 'You are not an order participant.');
  }
}

export const acceptOrder = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = requireString(request.data?.orderId, 'orderId');
  const eta = request.data?.etaMinutes;

  if (!Number.isInteger(eta) || eta < 10 || eta > 24 * 60) {
    throw new HttpsError('invalid-argument', 'ETA must be between 10 and 1440 minutes.');
  }

  const riderSnapshot = await db.doc(`users/${uid}`).get();
  if (!riderSnapshot.exists) {
    throw new HttpsError('failed-precondition', 'Rider profile does not exist.');
  }

  const rider = riderSnapshot.data()!;
  if (rider.isBanned === true || rider.isSuspended === true || rider.isRiderModePermanentlyBanned === true) {
    throw new HttpsError('permission-denied', 'Rider mode is not available for this account.');
  }

  const orderRef = db.doc(`orders/${orderId}`);
  const dispatchRef = db.doc(`orderDispatch/${orderId}`);
  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new HttpsError('not-found', 'Order does not exist.');
    }

    const order = orderSnapshot.data()!;
    if (order.status !== 'PENDING' || order.riderId) {
      throw new HttpsError('failed-precondition', 'This order is no longer available.');
    }

    transaction.update(orderRef, {
      status: 'ACCEPTED',
      riderId: uid,
      rider: {
        id: uid,
        name: typeof rider.name === 'string' ? rider.name : 'Rider',
        profilePhoto: typeof rider.profilePhoto === 'string' ? rider.profilePhoto : '',
        trustLevel: rider.trustLevel ?? 'LEVEL_1',
        rating: typeof rider.rating === 'number' ? rider.rating : 0,
      },
      declaredEtaMinutes: eta,
      riderAcceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(dispatchRef, {
      status: 'ACCEPTED',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { success: true };
});

export const transitionOrder = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = requireString(request.data?.orderId, 'orderId');
  const nextStatus = requireString(request.data?.status, 'status');
  const extraData = request.data?.extraData;

  if (!transitions[nextStatus]) {
    throw new HttpsError('invalid-argument', 'Unsupported order transition.');
  }
  if (extraData !== undefined && (extraData === null || typeof extraData !== 'object' || Array.isArray(extraData))) {
    throw new HttpsError('invalid-argument', 'extraData must be an object.');
  }
  const suppliedKeys = Object.keys(extraData || {});
  if (suppliedKeys.some((key) => !transitionExtraKeys[nextStatus].includes(key))) {
    throw new HttpsError('invalid-argument', 'Unsupported transition data.');
  }

  const orderRef = db.doc(`orders/${orderId}`);
  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new HttpsError('not-found', 'Order does not exist.');
    }

    const order = orderSnapshot.data()!;
    requireOrderParticipant(order, uid);

    if (!transitions[nextStatus].includes(order.status)) {
      throw new HttpsError('failed-precondition', `Cannot move order from ${order.status} to ${nextStatus}.`);
    }
    if (nextStatus === 'PAID' && order.clientId !== uid) {
      throw new HttpsError('permission-denied', 'Only the client can pay for an order.');
    }
    if (nextStatus === 'PHOTO_APPROVED' && order.clientId !== uid) {
      throw new HttpsError('permission-denied', 'Only the client can approve the purchased item.');
    }
    if (!['PAID', 'PHOTO_APPROVED', 'CANCELLED'].includes(nextStatus) && order.riderId !== uid) {
      throw new HttpsError('permission-denied', 'Only the assigned rider can perform this transition.');
    }
    transaction.update(orderRef, {
      ...(extraData as Record<string, unknown> | undefined),
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

export const cancelOrder = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = requireString(request.data?.orderId, 'orderId');
  const reason = requireString(request.data?.reason, 'reason');

  if (reason.length > 500) {
    throw new HttpsError('invalid-argument', 'Cancellation reason is too long.');
  }

  const orderRef = db.doc(`orders/${orderId}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Order does not exist.');

    const order = snapshot.data()!;
    if (order.clientId !== uid && order.riderId !== uid) {
      throw new HttpsError('permission-denied', 'You are not an order participant.');
    }
    if (['PENDING', 'ACCEPTED'].includes(order.status) === false) {
      throw new HttpsError('failed-precondition', 'This order can no longer be cancelled in the showcase flow.');
    }

    transaction.update(orderRef, {
      status: 'CANCELLED',
      cancelReason: reason,
      cancelledBy: uid,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(db.doc(`orderDispatch/${orderId}`), {
      status: 'CANCELLED',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { success: true };
});

export const declineOrder = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = requireString(request.data?.orderId, 'orderId');
  const reason = requireString(request.data?.reason, 'reason');

  if (reason.length > 500) {
    throw new HttpsError('invalid-argument', 'Decline reason is too long.');
  }

  const orderSnapshot = await db.doc(`orders/${orderId}`).get();
  if (!orderSnapshot.exists) throw new HttpsError('not-found', 'Order does not exist.');
  const order = orderSnapshot.data()!;
  if (order.status !== 'PENDING' || order.riderId) {
    throw new HttpsError('failed-precondition', 'This order is no longer available to decline.');
  }

  await db.doc(`orders/${orderId}/declines/${uid}`).set({
    riderId: uid,
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

export const verifyDeliveryOtp = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = requireString(request.data?.orderId, 'orderId');
  const code = requireString(request.data?.code, 'code');

  if (!/^\d{4}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'OTP must be exactly 4 digits.');
  }

  const orderRef = db.doc(`orders/${orderId}`);
  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) {
      throw new HttpsError('not-found', 'Order does not exist.');
    }

    const order = orderSnapshot.data()!;
    if (order.clientId !== uid && order.riderId !== uid) {
      throw new HttpsError('permission-denied', 'You are not an order participant.');
    }
    if (order.riderId !== uid) {
      throw new HttpsError('permission-denied', 'Only the assigned rider can verify delivery.');
    }
    if (order.status !== 'ARRIVED') {
      throw new HttpsError('failed-precondition', 'The order is not ready for delivery verification.');
    }
    if (code !== DEMO_DELIVERY_OTP) {
      throw new HttpsError('invalid-argument', 'Incorrect delivery OTP.');
    }

    transaction.update(orderRef, {
      status: 'DELIVERED',
      deliveredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

export const sendOrderMessage = onCall(async (request) => {
  const uid = requireAuth(request);
  const orderId = requireString(request.data?.orderId, 'orderId');
  const content = requireString(request.data?.content, 'content');

  if (content.length > 2000) {
    throw new HttpsError('invalid-argument', 'Message is too long.');
  }

  const orderSnapshot = await db.doc(`orders/${orderId}`).get();
  if (!orderSnapshot.exists) {
    throw new HttpsError('not-found', 'Order does not exist.');
  }
  requireOrderParticipant(orderSnapshot.data()!, uid);

  const userSnapshot = await db.doc(`users/${uid}`).get();
  const user = userSnapshot.data() || {};
  await db.collection(`orders/${orderId}/messages`).add({
    senderId: uid,
    sender: {
      id: uid,
      name: typeof user.name === 'string' ? user.name : 'User',
      profilePhoto: typeof user.profilePhoto === 'string' ? user.profilePhoto : '',
    },
    content,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

export const createOrderDispatch = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data();
  const orderId = event.params.orderId;
  if (!order) return;

  await db.doc(`orderDispatch/${orderId}`).create({
    orderId,
    status: order.status,
    itemName: order.itemName,
    itemDescription: order.itemDescription || '',
    shopName: order.shopName || '',
    shopLocation: order.shopLocation || '',
    shopMode: order.shopMode,
    expectedPrice: order.expectedPrice,
    weightKg: order.weightKg,
    distanceKm: order.distanceKm,
    deliveryFee: order.deliveryFee,
    createdAt: order.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});
