document.addEventListener('DOMContentLoaded', function() {
  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', function() {
    // Get recipients from wherever they are stored (e.g., input field, array, etc.)
    const recipients = ""; 
    
    // Call compose_email function with recipients
    compose_email(recipients);
  });

  // By default, load the inbox
  load_mailbox('inbox');

  // Listen for popstate event to handle back button navigation
  window.addEventListener('popstate', function(event) {
    const state = event.state;
    if (state) {
      if (state.mailbox) {
        if (state.emailId) {
          display_email(state.mailbox, state.emailId);
        } else {
          load_mailbox(state.mailbox);
        }
      } else if (state.compose) {
        compose_email(state.recipients);
      } 
    } else {
      // Handle other cases where there's no state
      // TODO
    }
  });
});

function compose_email(recipients) {
  history.pushState({compose: true, recipients: recipients}, '', 'compose'); 
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = recipients;
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // Select the success and error message containers
  const successMessage = document.querySelector('#success-message');
  const errorMessage = document.querySelector('#error-message');

  // Add event listener for form submission
  document.querySelector('#compose-form').onsubmit = function(event) {
      event.preventDefault();

      // Get form values
      const recipients = document.querySelector('#compose-recipients').value;
      const subject = document.querySelector('#compose-subject').value;
      const body = document.querySelector('#compose-body').value;

      // Send email data to server
      fetch('/emails', {
          method: 'POST',
          body: JSON.stringify({
              recipients: recipients,
              subject: subject,
              body: body
          })
      })
      .then(response => {
          if (!response.ok) {
              // Display error message
              return response.json().then(data => {
                  errorMessage.textContent = data.error;
                  errorMessage.style.display = 'block';
                  // Hide error message after 3 seconds
                  setTimeout(() => {
                      errorMessage.style.display = 'none';
                  }, 3000);
                  throw new Error(data.error); // throw error to catch block
              });
          } else {
              return response.json();
          }
      })
      .then(result => {
          // Print result
          console.log(result);
          load_mailbox("sent");
          // Display success message
          successMessage.textContent = result.message;
          successMessage.style.display = 'block';
          // Hide success message after 3 seconds
          setTimeout(() => {
              successMessage.style.display = 'none';
          }, 3000);
      })
      .catch(error => {
          console.error('Error:', error);
          // No need to display error message here, it's already handled in the previous .then() block
      });
  };
}

function load_mailbox(mailbox) {
  history.pushState({mailbox: mailbox}, '', `/emails/${mailbox}`);
  // Show the mailbox and hide other views
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'block';

  // Fetch emails
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Clear previous emails
      document.querySelector('#emails-view').innerHTML = '';

      // Add mailbox title
      const mailboxTitle = document.createElement('h3');
      mailboxTitle.textContent = mailbox.charAt(0).toUpperCase() + mailbox.slice(1);
      document.querySelector('#emails-view').appendChild(mailboxTitle);

      // Create list group
      const listGroup = document.createElement('div');
      listGroup.classList.add('list-group');
      document.querySelector('#emails-view').appendChild(listGroup);

      // Loop through emails and create list items for each email
      emails.forEach(email => {
        const emailItem = document.createElement('button');
        // Determine the class based on the read attribute
         // Set background color based on read status
         if (email.read) {
          emailItem.style.backgroundColor = '#f0f0f0'; // Light grey background for read emails
        }
        emailItem.classList.add("list-group-item", 'list-group-item-action');
  
        if (mailbox == "inbox"){
          emailItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <p class="mb-1">From: <strong>${email.sender}</strong></p>
            <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Archive</button> </small>
          </div>
          <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
          
        `;
        } else if (mailbox == "archive")  {
          if (email.sender == email.user){
              emailItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">To: <strong>${email.recipients}</strong></h6>
              <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Unarchive</button></small>  
            </div>
            <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
          `;
          } else {
            emailItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">From: <strong>${email.sender}</strong></h6>
            <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Unarchive</button></small>  
          </div>
          <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
        `;
          }
          
        } else {
          emailItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">To: <strong>${email.recipients}</strong></h6>
              <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Archive</button></small>  
            </div>
            <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
          `;
        }

        emailItem.querySelector('.archive-button').addEventListener('click', function(event) {
          //event.stopPropagation(); // Prevent click event from bubbling to email item
          const isArchived = email.archived;
          const newArchiveState = !isArchived; // Toggle the archive state
          const targetmailbox = mailbox
          archiveEmail(email.id, newArchiveState, targetmailbox);
        })
       

        emailItem.addEventListener('click', function() {
          display_email(mailbox, email.id); 
        });
        listGroup.appendChild(emailItem);
      });
    });
}

function display_email(mailbox, emailId) {
  history.pushState({mailbox: mailbox, emailId: emailId}, '', `/emails/${emailId}`);
  
  fetch(`/emails/${emailId}`)
    .then(response => response.json())
    .then(clickedEmail => {
      // Clear emails view
      document.querySelector('#emails-view').innerHTML = '';

      // Create div for clicked email details
      const clickedEmailElement = document.createElement('div');
      clickedEmailElement.classList.add('email');

      // Update read status of the email
      fetch(`/emails/${emailId}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })

      if (clickedEmail.sender == clickedEmail.user){
        clickedEmailElement.innerHTML = `
          <div class="email-details">
            <p><strong>To:</strong> ${clickedEmail.recipients}</p>
            <p><strong>Subject:</strong> ${clickedEmail.subject}</p>
            <p><strong>Timestamp:</strong> ${clickedEmail.timestamp}</p>
            <hr>
            <p>${clickedEmail.body}</p>
          </div>
        `;
      } else {
        clickedEmailElement.innerHTML = `
          <div class="email-details">
            <p><strong>From:</strong> ${clickedEmail.sender}</p>
            <p><strong>Subject:</strong> ${clickedEmail.subject}</p>
            <p><strong>Timestamp:</strong> ${clickedEmail.timestamp}</p>
            <p><button id="reply-button">Reply</button></p> <!-- "Reply" button placed next to sender's email -->
            <hr>
            <p>${clickedEmail.body}</p>
          </div>
        `;
        // Add event listener for the reply button
        clickedEmailElement.querySelector('#reply-button').addEventListener('click', function() {
          // Call compose_email function with sender's email as recipients
          compose_email(clickedEmail.sender);
        });
      }
    
      document.querySelector('#emails-view').appendChild(clickedEmailElement);
    });
}

function archiveEmail(emailId, newArchiveState, targetmailbox) {
  // Send PUT request to archive email
  fetch(`/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: newArchiveState
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to archive email.');
    }
    
    // Load the appropriate mailbox after archiving
    load_mailbox(targetmailbox);
  })
  .catch(error => {
    console.error('Error:', error);
    // Handle error
  });
}
