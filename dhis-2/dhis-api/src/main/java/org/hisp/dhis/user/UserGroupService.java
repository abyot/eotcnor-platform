/*
 * Copyright (c) 2004-2022, University of Oslo
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * Neither the name of the HISP project nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package org.hisp.dhis.user;

import java.util.Collection;
import java.util.List;

public interface UserGroupService
{
    String ID = UserGroupService.class.getName();

    long addUserGroup( UserGroup userGroup );

    void updateUserGroup( UserGroup userGroup );

    void deleteUserGroup( UserGroup userGroup );

    UserGroup getUserGroup( long userGroupId );

    UserGroup getUserGroup( String uid );

    /**
     * Indicates whether the current user can add or remove members for the user
     * group with the given UID. To to so the current user must have write
     * access to the group or have read access as well as the
     * F_USER_GROUPS_READ_ONLY_ADD_MEMBERS authority.
     *
     * @param uid the user group UID.
     * @return true if the current user can add or remove members of the user
     *         group.
     */
    boolean canAddOrRemoveMember( String uid );

    boolean canAddOrRemoveMember( String uid, User currentUser );

    void addUserToGroups( User user, Collection<String> uids );

    void addUserToGroups( User user, Collection<String> uids, User currentUser );

    void removeUserFromGroups( User user, Collection<String> uids );

    void updateUserGroups( User user, Collection<String> uids );

    /**
     * This method will check and perform add/remove given {@link User} from
     * given {@link UserGroup} member list. The final result is that given
     * {@link User} will only belong to given {@link UserGroup} list.
     *
     * @param user the {@link User} which will be added or removed from given
     *        list of {@link UserGroup}
     * @param userGroupIds List uid of {@link UserGroup}
     * @param currentUser Current User.
     */
    void updateUserGroups( User user, Collection<String> userGroupIds, User currentUser );

    List<UserGroup> getAllUserGroups();

    List<UserGroup> getUserGroupByName( String name );

    List<UserGroup> getUserGroupsBetween( int first, int max );

    List<UserGroup> getUserGroupsBetweenByName( String name, int first, int max );

    int getUserGroupCount();

    int getUserGroupCountByName( String name );

    /**
     * Get UserGroup's display name by given userGroup uid Return null if
     * UserGroup does not exist
     */
    String getDisplayName( String uid );
}