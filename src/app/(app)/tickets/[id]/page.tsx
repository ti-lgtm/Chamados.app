"use client";

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collectionGroup,
  query,
  where,
  limit,
  documentId,
} from "firebase/firestore";
import { useFirestore } from "@/firebase";
import type { Ticket, AppUser } from "@/lib/types";
import { notFound } from "next/navigation";
import { TicketDetailsClient } from "@/components/tickets/ticket-details-client";
import { Loader2 } from "lucide-react";

async function getTicketData(
  firestore: any,
  ticketId: string
): Promise<Ticket | null> {
  if (!firestore) return null;

  // Use a collection group query to find the ticket by its ID across all users
  const ticketsCollectionGroup = collectionGroup(firestore, "tickets");
  const q = query(
    ticketsCollectionGroup,
    where(documentId(), "==", ticketId),
    limit(1)
  );

  const ticketSnapshots = await getDocs(q);

  if (ticketSnapshots.empty) {
    return null;
  }

  const ticketSnap = ticketSnapshots.docs[0];
  const ticketData = ticketSnap.data();

  // Fetch user data
  let user;
  if (ticketData.userId) {
    const userRef = doc(firestore, "users", ticketData.userId);
    const userSnap = await getDoc(userRef);
    user = userSnap.exists()
      ? ({ uid: userSnap.id, ...userSnap.data() } as AppUser)
      : undefined;
  }

  // Fetch assigned user data
  let assignedUser = null;
  if (ticketData.assignedTo) {
    const assignedUserRef = doc(firestore, "users", ticketData.assignedTo);
    const assignedUserSnap = await getDoc(assignedUserRef);
    assignedUser = assignedUserSnap.exists()
      ? ({ uid: assignedUserSnap.id, ...assignedUserSnap.data() } as AppUser)
      : null;
  }

  return {
    id: ticketSnap.id,
    ...ticketData,
    user,
    assignedUser,
  } as Ticket;
}

export default function TicketPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTicketData(firestore, params.id)
      .then((ticketData) => {
        if (!ticketData) {
          notFound();
        } else {
          setTicket(ticketData);
        }
      })
      .catch(() => {
        notFound();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [firestore, params.id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return null; // notFound() would have been called
  }

  return <TicketDetailsClient initialTicket={ticket} />;
}
