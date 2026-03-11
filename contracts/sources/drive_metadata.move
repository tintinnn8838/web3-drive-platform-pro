module web3_drive::drive_metadata {
    use std::string::String;
    use std::vector;
    use std::signer;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // ===== Structs =====

    struct FileMetadata has copy, drop, store {
        blob_id:      String,
        file_name:    String,
        content_type: String,
        size:         u64,
        uploaded_at:  u64,
        is_deleted:   bool,
    }

    struct SharedAccess has copy, drop, store {
        target:     address,
        permission: u8,  // 0 = read, 1 = write
        granted_at: u64,
    }

    struct Drive has key {
        files:   vector<FileMetadata>,
        shares:  vector<SharedAccess>,
    }

    // ===== Events =====

    #[event]
    struct FileAdded has drop, store {
        owner:       address,
        blob_id:     String,
        file_name:   String,
        uploaded_at: u64,
    }

    #[event]
    struct FileDeleted has drop, store {
        owner:    address,
        blob_id:  String,
        deleted_at: u64,
    }

    #[event]
    struct FileShared has drop, store {
        owner:      address,
        target:     address,
        permission: u8,
        shared_at:  u64,
    }

    // ===== Entry Functions =====

    /// Khởi tạo Drive cho account
    public entry fun init(account: &signer) {
        let owner = signer::address_of(account);
        assert!(!exists<Drive>(owner), 1001); // DRIVE_ALREADY_EXISTS
        move_to(account, Drive {
            files:  vector::empty<FileMetadata>(),
            shares: vector::empty<SharedAccess>(),
        });
    }

    /// Thêm file metadata on-chain sau khi upload thành công
    public entry fun add_file(
        account:      &signer,
        blob_id:      String,
        file_name:    String,
        content_type: String,
        size:         u64,
    ) acquires Drive {
        let owner = signer::address_of(account);
        assert!(exists<Drive>(owner), 1002); // DRIVE_NOT_INITIALIZED

        let now = timestamp::now_seconds();
        let drive = borrow_global_mut<Drive>(owner);

        vector::push_back(&mut drive.files, FileMetadata {
            blob_id,
            file_name,
            content_type,
            size,
            uploaded_at: now,
            is_deleted: false,
        });

        event::emit(FileAdded {
            owner,
            blob_id,
            file_name,
            uploaded_at: now,
        });
    }

    /// Đánh dấu file đã xóa (soft delete để giữ lịch sử on-chain)
    public entry fun delete_file(
        account: &signer,
        blob_id: String,
    ) acquires Drive {
        let owner = signer::address_of(account);
        assert!(exists<Drive>(owner), 1002);

        let now = timestamp::now_seconds();
        let drive = borrow_global_mut<Drive>(owner);
        let len = vector::length(&drive.files);
        let i = 0;

        while (i < len) {
            let file = vector::borrow_mut(&mut drive.files, i);
            if (file.blob_id == blob_id && !file.is_deleted) {
                file.is_deleted = true;
                event::emit(FileDeleted { owner, blob_id, deleted_at: now });
                return
            };
            i = i + 1;
        };

        abort 1003 // FILE_NOT_FOUND
    }

    /// Chia sẻ quyền truy cập với địa chỉ khác
    public entry fun share_access(
        account:    &signer,
        target:     address,
        permission: u8,
    ) acquires Drive {
        let owner = signer::address_of(account);
        assert!(exists<Drive>(owner), 1002);
        assert!(permission <= 1, 1004); // INVALID_PERMISSION

        let now = timestamp::now_seconds();
        let drive = borrow_global_mut<Drive>(owner);

        // Cập nhật nếu đã share trước đó
        let len = vector::length(&drive.shares);
        let i = 0;
        while (i < len) {
            let share = vector::borrow_mut(&mut drive.shares, i);
            if (share.target == target) {
                share.permission = permission;
                share.granted_at = now;
                event::emit(FileShared { owner, target, permission, shared_at: now });
                return
            };
            i = i + 1;
        };

        vector::push_back(&mut drive.shares, SharedAccess { target, permission, granted_at: now });
        event::emit(FileShared { owner, target, permission, shared_at: now });
    }

    /// Revoke quyền truy cập
    public entry fun revoke_access(
        account: &signer,
        target:  address,
    ) acquires Drive {
        let owner = signer::address_of(account);
        assert!(exists<Drive>(owner), 1002);

        let drive = borrow_global_mut<Drive>(owner);
        let len = vector::length(&drive.shares);
        let i = 0;

        while (i < len) {
            let share = vector::borrow(&drive.shares, i);
            if (share.target == target) {
                vector::remove(&mut drive.shares, i);
                return
            };
            i = i + 1;
        };
    }

    // ===== View Functions =====

    #[view]
    public fun get_file_count(owner: address): u64 acquires Drive {
        if (!exists<Drive>(owner)) return 0;
        let drive = borrow_global<Drive>(owner);
        let total = 0u64;
        let i = 0;
        let len = vector::length(&drive.files);
        while (i < len) {
            if (!vector::borrow(&drive.files, i).is_deleted) total = total + 1;
            i = i + 1;
        };
        total
    }

    #[view]
    public fun has_access(owner: address, requester: address): bool acquires Drive {
        if (owner == requester) return true;
        if (!exists<Drive>(owner)) return false;
        let drive = borrow_global<Drive>(owner);
        let i = 0;
        let len = vector::length(&drive.shares);
        while (i < len) {
            if (vector::borrow(&drive.shares, i).target == requester) return true;
            i = i + 1;
        };
        false
    }
}
