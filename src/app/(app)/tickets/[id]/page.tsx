import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Ticket, AppUser } from "@/lib/types";
import { notFound } from "next/navigation";
import { TicketDetailsClient } from "@/components/tickets/ticket-details-client";

async function getTicketData(ticketId: string): Promise<Ticket | null> {
    const ticketRef = doc(db, "tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
        return null;
    }

    const ticketData = ticketSnap.data();

    // Fetch user data
    const userRef = doc(db, "users", ticketData.userId);
    const userSnap = await getDoc(userRef);
    const user = userSnap.exists() ? { uid: userSnap.id, ...userSnap.data() } as AppUser : undefined;

    // Fetch assigned user data
    let assignedUser = null;
    if (ticketData.assignedTo) {
        const assignedUserRef = doc(db, "users", ticketData.assignedTo);
        const assignedUserSnap = await getDoc(assignedUserRef);
        assignedUser = assignedUserSnap.exists() ? { uid: assignedUserSnap.id, ...assignedUserSnap.data() } as AppUser : null;
    }
    
    return {
        id: ticketSnap.id,
        ...ticketData,
        user,
        assignedUser
    } as Ticket;
}

export default async function TicketPage({ params }: { params: { id: string } }) {
  const ticket = await getTicketData(params.id);

  if (!ticket) {
    notFound();
  }

  return (
    <TicketDetailsClient initialTicket={ticket} />
  );
}
