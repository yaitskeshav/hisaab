import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import storage from '../utils/storage';

const useInviteStore = create(
    persist(
        (set) => ({
            pendingInviteToken: null,

            setPendingInviteToken: (token) => {
                set({ pendingInviteToken: token });
            },

            clearPendingInviteToken: () => {
                set({ pendingInviteToken: null });
            },
        }),
        {
            name: 'invite-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);

export default useInviteStore;
